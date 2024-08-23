import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { readFileSync } from "fs";

import * as rds from "aws-cdk-lib/aws-rds";

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "BlogVpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
    });

    const webServer1 = new ec2.Instance(this, "WordpressServer1", {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const script = readFileSync("./lib/resources/user-data.sh", "utf8");
    webServer1.addUserData(script);

    webServer1.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    new CfnOutput(this, "WordpressServer1PublicIPAddress", {
      value: `http://${webServer1.instancePublicIp}`,
    });

    const dbServer = new rds.DatabaseInstance(this, "WordPressDB", {
      vpc,
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_36 }),
      // RDS DB インスタンスのインスタンスタイプを設定
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      // RDS DB インスタンスのデータベース名を設定
      databaseName: "wordpress",
    });

    // WebServer からのアクセスを許可
    dbServer.connections.allowDefaultPortFrom(webServer1);
  }
}