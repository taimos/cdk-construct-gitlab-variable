import { Construct, Duration, Stack } from '@aws-cdk/core';
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { Runtime, Code, SingletonFunction, IFunction } from '@aws-cdk/aws-lambda';
import { Provider } from '@aws-cdk/custom-resources';
import { CustomResource } from '@aws-cdk/aws-cloudformation';
import { join } from 'path';

export interface GitlabVariableProps {
    /**
     * the secret containing teh secret to publish to Gitlab
     */
    readonly secret: ISecret;
    /**
     * the field name with the secret to publish
     * 
     * @default - use the whole SecretString of the secret as value
     */
    readonly secretField?: string;
    /**
     * the project id within Gitlab `group/project-name`
     */
    readonly projectId: string;
    /**
     * the name of the variable to set in Gitlab 
     */
    readonly variableName: string;
    /**
     * the URL of the Gitlab server
     * 
     * @default https://gitlab.com
     */
    readonly serverUrl?: string;
    /**
     * the secret containing the Gitlab token to access the API
     */
    readonly gitlabSecret: ISecret;

}

export class GitlabVariable extends Construct {

    constructor(scope: Construct, id: string, props: GitlabVariableProps) {
        super(scope, id);

        const crLambda = new SingletonFunction(this, 'Function', {
            uuid: 'GitlabVariableCustomResourceFunction',
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(join(__dirname, 'lambda.zip')),
            handler: 'dist/index.handler',
            timeout: Duration.seconds(30),
        });
        props.secret.grantRead(crLambda);
        props.gitlabSecret.grantRead(crLambda);

        new CustomResource(this, 'Resource', {
            provider: this.ensureProvider(crLambda),
            resourceType: 'Custom::GitlabVariable',
            properties: {
                secretArn: props.secret.secretArn,
                secretField: props.secretField,
                projectId: props.projectId,
                variableName: props.variableName,
                serverUrl: props.serverUrl,
                gitlabSecretArn: props.gitlabSecret.secretArn,
            },
        });
    }

    ensureProvider(crLambda: IFunction): Provider {
        const constructName = 'GitlabVariableCRProvider';
        const existing = Stack.of(this).node.tryFindChild(constructName);
        if (existing) {
            return existing as Provider;
        }
        return new Provider(Stack.of(this), constructName, { onEventHandler: crLambda });
    }
}
