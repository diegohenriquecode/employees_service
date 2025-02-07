/* eslint-disable */
const isEqual = require('lodash/isEqual');

const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
const policy = resources.IamRoleLambdaExecution.Properties.Policies[0].PolicyDocument;

const Action = [
    "dynamodb:GetRecords",
    "dynamodb:GetShardIterator",
    "dynamodb:DescribeStream",
    "dynamodb:ListStreams"
];

policy.Statement = policy.Statement
    .filter(s => !(s.Effect === "Allow" && isEqual(s.Action, Action)))

policy.Statement.push({
    Effect: "Allow",
    Action,
    Resource: [{
        "Fn::Sub": "arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/Barueri*/stream/*",
    }],
});
