import {GitlabVariable} from '../lib/index';
import {App, Stack} from '@aws-cdk/core';
import {expect as expectCDK, haveResourceLike} from '@aws-cdk/assert';
import { Secret } from '@aws-cdk/aws-secretsmanager';

test('Has a Lambda function', () => {
    const mockApp = new App();
    const stack = new Stack(mockApp, 'testing-stack');

    const secret = new Secret(stack, 'DBSecret', {
        description: 'Some Secret',
        generateSecretString: {
          secretStringTemplate: '{"username":"admin2"}',
          generateStringKey: 'password',
          passwordLength: 20,
        },
      });

    new GitlabVariable(stack, 'testing', {
        secret,
        secretField: 'password',
        projectId: 'group/secrets-test',
        variableName: 'RDS_PASSWORD2',
        gitlabSecret: Secret.fromSecretArn(stack, 'GitlabToken', 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:GitlabToken-abcd'),
    });

    expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
        Handler: 'dist/index.handler',
    }));

});
