import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";

// 自作コンストラクトを import
import { WebServerInstance } from './constructs/web-server-instance';

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "BlogVpc", {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    });

    // 新しく作成したコンストラクトを使用してインスタンスを宣言
    const webServer1 = new WebServerInstance(this, 'WebServer1', {
      vpc
    });

    const webServer2 = new WebServerInstance(this, 'WebServer2', {
      vpc
    });

    const dbServer = new rds.DatabaseInstance(this, "WordPressDB", {
      vpc,
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_36 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      databaseName: "wordpress",
      // multiAZ を true へ
      multiAz: true,
    });

    // アクセス許可対象をコンストラクト内のインスタンスに変更
    dbServer.connections.allowDefaultPortFrom(webServer1.instance);
    // 2 台目のインスタンスの DB インスタンスへのアクセスを許可
    dbServer.connections.allowDefaultPortFrom(webServer2.instance);

    const alb = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: true,
    });
    const listener = alb.addListener("Listener", {
      port: 80,
    });
    listener.addTargets("ApplicationFleet", {
      port: 80,
      // ターゲットをコンストラクト内のインスタンスに変更
      targets: [new targets.InstanceTarget(webServer1.instance, 80),
        // ターゲットに 2 台目のインスタンスを追加
        new targets.InstanceTarget(webServer2.instance, 80)],
      healthCheck: {
        path: "/wp-includes/images/blank.gif",
      },
    });

    // ALB からインスタンスへのアクセスを許可
    webServer1.instance.connections.allowFrom(alb, ec2.Port.tcp(80));
    // ALB から 2 台目のインスタンスへのアクセスを許可
    webServer2.instance.connections.allowFrom(alb, ec2.Port.tcp(80));
  }
}