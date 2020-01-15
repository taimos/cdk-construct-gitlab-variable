[![npm version](https://badge.fury.io/js/%40taimos%2Fcdk-construct-gitlab-variable.svg)](https://badge.fury.io/js/%40taimos%2Fcdk-construct-gitlab-variable)
[![PyPI version](https://badge.fury.io/py/taimos.cdk-construct-gitlab-variable.svg)](https://badge.fury.io/py/taimos.cdk-construct-gitlab-variable)

# A CDK L3 Construct for storing Gitlab CI variables from a SecretsManager secret

## Installation

You can install the library into your project using npm or pip.

```bash
npm install @taimos/cdk-construct-gitlab-variable

pip3 install taimos.cdk-construct-gitlab-variable
```

## Usage

```ts

const secret = new Secret(this, 'DBSecret', {
    description: 'Some Secret',
    generateSecretString: {
        secretStringTemplate: '{"username":"admin2"}',
        generateStringKey: 'password',
        passwordLength: 20,
    }
});

const gitlabSecret = Secret.fromSecretArn(this, 'GitlabToken', 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:GitlabToken-abcde');

const dbPassword = new GitlabVariable(this, 'GitlabVarPassword', {
    gitlabSecret,
    secret,
    secretField: 'password',
    projectId: 'group/secrets-test',
    variableName: 'RDS_PASSWORD',
});

```

# Contributing

We welcome community contributions and pull requests. 

# License

The CDK construct library is distributed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).

See [LICENSE](./LICENSE) for more information.