#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { CdkEksNodeGroupStack } from '../lib/nodegroup-stack';

const app = new cdk.App();

const stackName = app.node.getContext('nodeGroupStackName');
const clusterName = app.node.getContext('clusterName');
const vpcName = app.node.getContext('vpcName');
const clusterStackName = app.node.getContext('clusterStackName');
const keyPairName = app.node.getContext('keyPairName');
const maxSize = app.node.getContext('maxSize');
const minSize = app.node.getContext('minSize');
const desiredCapacity = app.node.getContext('desiredCapacity');
const nodeAmiMap = app.node.getContext('nodeAmiMap');
const instanceClass = app.node.getContext('instanceClass');
const instanceSize = app.node.getContext('instanceSize');
const nodeGroupStackName = app.node.getContext('nodeGroupStackName');
new CdkEksNodeGroupStack(app, stackName, {
  clusterName,
  vpcName,
  clusterStackName,
  keyPairName,
  maxSize,
  minSize,
  desiredCapacity,
  nodeAmiMap,
  instanceClass,
  instanceSize,
  nodeGroupStackName
});
app.run();
