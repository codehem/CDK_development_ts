import { CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { readFileSync } from "fs";

// Construct props を定義
export interface WebServerInstanceProps {
  readonly vpc: ec2.IVpc
}

// EC2 インスタンスを含む Construct を定義
export class WebServerInstance extends Construct {
  // 外部からインスタンスへアクセスできるように設定
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: WebServerInstanceProps) {
    super(scope, id);

    // Construct props から vpc を取り出す
    const { vpc } = props;

    const instance = new ec2.Instance(this, "Instance", {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const script = readFileSync("./lib/resources/user-data.sh", "utf8");
    instance.userData.addCommands(script);

    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    // 作成した EC2 インスタンスをプロパティに設定
    this.instance = instance;
  
    new CfnOutput(this, "WordpressServer1PublicIPAddress", {
      value: `http://${instance.instancePublicIp}`,
    });
  }
}