import { SecretsManager } from 'aws-sdk';
import { CloudFormationCustomResourceUpdateEvent, CloudFormationCustomResourceDeleteEvent, CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as gitlab from 'gitlab';

async function getGitlabToken(gitlabSecretArn: string) {
    const sm = new SecretsManager();
    const secret = await sm.getSecretValue({ SecretId: gitlabSecretArn }).promise();
    if (!secret || !secret.SecretString) {
        throw 'Error retrieving value from secret. Did not find secret';
    }
    return secret.SecretString;
}

async function getSecretValue(secretArn: string, fieldName?: string) {
    const sm = new SecretsManager();
    const secret = await sm.getSecretValue({ SecretId: secretArn }).promise();
    if (!secret || !secret.SecretString) {
        throw 'Error retrieving value from secret. Did not find secret';
    }
    if (!fieldName) {
        return secret.SecretString;
    }
    const body = JSON.parse(secret.SecretString);
    if (!body.hasOwnProperty(fieldName)) {
        throw 'Error retrieving value from secret. Did not find field ' + fieldName;
    }
    return body[fieldName];
}

function splitPhysicalResource(resource: string) {
    const parts = resource.split('#');
    if (parts.length !== 3) {
        throw 'Could not find project and variable from resource id ' + resource;
    }
    return {
        serverUrl: parts[0],
        projectId: parts[1],
        variableName: parts[2],
    }
}

async function onCreate(props: { ServiceToken: string; [Key: string]: any; }) {
    const secretArn = props.SecretArn;
    const fieldName = props.SecretField;
    const projectId = props.ProjectId;
    const variableName = props.VariableName;
    const gitlabSecretArn = props.GitlabSecretArn;
    const serverUrl = props.ServerUrl || 'https://gitlab.com';

    const token = await getGitlabToken(gitlabSecretArn);
    const value = await getSecretValue(secretArn, fieldName);

    const api = new gitlab.Gitlab({ host: serverUrl, token });
    const res = await api.ProjectVariables.create(projectId, {
        key: variableName,
        value,
        protected: true,
        masked: false,
    });
    console.log(res);

    return { PhysicalResourceId: `${serverUrl}#${projectId}#${variableName}` };
}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
    const secretArn = event.ResourceProperties.SecretArn;
    const fieldName = event.ResourceProperties.SecretField;
    const projectId = event.ResourceProperties.ProjectId;
    const variableName = event.ResourceProperties.VariableName;
    const serverUrl = event.ResourceProperties.ServerUrl || 'https://gitlab.com';
    const oldResource = splitPhysicalResource(event.PhysicalResourceId);
    const gitlabSecretArn = event.ResourceProperties.GitlabSecretArn;

    const token = await getGitlabToken(gitlabSecretArn);

    if (oldResource.serverUrl === serverUrl && oldResource.projectId === projectId && oldResource.variableName === variableName) {
        // Do update of secret value
        const value = await getSecretValue(secretArn, fieldName);
        const api = new gitlab.Gitlab({ host: serverUrl, token });
        const res = await api.ProjectVariables.edit(projectId, variableName, {
            value,
            protected: true,
            masked: false,
        });
        console.log(res);
        return {};
    } else {
        return onCreate(event.ResourceProperties);
    }
}

async function onDelete(event: CloudFormationCustomResourceDeleteEvent) {
    const oldResource = splitPhysicalResource(event.PhysicalResourceId);
    const gitlabSecretArn = event.ResourceProperties.GitlabSecretArn;

    const token = await getGitlabToken(gitlabSecretArn);

    const api = new gitlab.Gitlab({ host: oldResource.serverUrl, token });
    const res = await api.ProjectVariables.remove(oldResource.projectId, oldResource.variableName);
    console.log(res);

    return {};
}

exports.handler = async (event: CloudFormationCustomResourceEvent) => {
    console.log(event);
    switch (event.RequestType) {
        case 'Create':
            return onCreate(event.ResourceProperties);
        case 'Update':
            return onUpdate(event);
        case 'Delete':
            return onDelete(event);
        default:
            throw 'Invalid event';
    }
}
