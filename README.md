# README

## Execução local
Crie um arquivo .env.offline e preencha de acordo com o arquivo .env.example  
Dados podem ser encontrados no secrets de dev.

O start (yarn start) inicia as instâncias docker de mysql, sqs e dynamodb.  
Necessário ter o plugin `compose` do docker que pode ser instalado seguindo a [documentação](https://docs.docker.com/compose/install/).  
Durante o start também ocorrerá migração do mysql chamando o lambda.

Primeiramente, execute o comando abaixo, para criação dos templates de email

```
$ yarn build:templates
```

Utiliza-se do plugin *serverless-offline* para execução local dos lambdas juntamente com outros plugins para funcionamento de outros serviços. 
```
$ yarn start
```

Caso queira subir as seeds do mysql(provavelmente irá querer por conta dos usuários) e algumas do dynamo execute o seguinte comando
```
$ yarn local:seed
```
Esse comando criará setores, usuários e gestores garantindo 4 usuários especiais: admin, rh, manager e employee.  
Também criará feedbacks(somente mysql) e avaliações.

Caso queira invocar um lambda local execute o seguinte comando
```
$ aws lambda invoke /dev/null \
--endpoint-url http://localhost:8605 \
--function-name myFunction-invokedHandler
```

onde o endpoint-url e o function-name são mostrados no terminal após um yarn start.

### Ferramentas para debug local
* ElasticMQ: http://localhost:9325/
* DynamoDB: executar comando `yarn dynamodb-admin` e acessar http://localhost:8001/

## Deploy (deprecated)
O script de deploy está em "scripts/deploy.sh", mas deve ser invocado de um nível acima do projeto, como abaixo:
```
$ ./barueri-backend/scripts/deploy.sh <aws-profile> <branch>
```
**O deploy dever ser feito preferencialmente pelo bitbucket-pipelines**

## Config
As configurações e segredos globais são guardados em um secret do AWS Secrets Manager chamado `barueri-config` que deve ser criado e preenchido manualmente.

As chaves necessárias estão documentadas [aqui](./.local/ssm.yml)

## Domínios
A stack pressupõe a preexistência de uma Hosted Zone (Route 53) e certificado (ACM) para os (sub)domínios que serão utilizados.

## Deploy
### 1. Build de templates de email (se houver)
```
$ yarn build:templates
```
### 2. Stack
```
$ yarn serverless deploy -v --aws-profile <profile-name-here>
```
### 3. Migração do banco (se houver)
```
$ yarn serverless invoke -f migrate -v --aws-profile <profile-name-here>
```

## MySQL

### Adicionar migration
```
$ yarn knex migrate:make --migrations-directory 'src/modules/<module-name>/migrations' migration_name
```

### Rodar todas as migrações pendentes

#### Online:
```
yarn serverless invoke -f migrate --aws-profile <aws-profile>
```

#### Offline:

```
$ aws lambda invoke /dev/null --endpoint-url http://localhost:8605 --function-name barueri-backend-offline-migrate
```

### Rodar a próxima migração pendente
#### Online:
```
yarn serverless invoke -f migrate -d 'up' --aws-profile <aws-profile>
```
#### Offline:
```
$ aws lambda invoke /dev/null --endpoint-url http://localhost:8605 --function-name barueri-backend-offline-migrate --payload $(echo '"up"' | base64)
```

### Desfazer última migração aplicada
#### Online:
```
yarn serverless invoke -f migrate -d 'down' --aws-profile <aws-profile>
```
#### Offline:
```
$ aws lambda invoke /dev/null --endpoint-url http://localhost:8605 --function-name barueri-backend-offline-migrate --payload $(echo '"down"' | base64)
```
# employees_service
