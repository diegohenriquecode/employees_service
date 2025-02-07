#!/bin/bash

docker compose up -d
mysql_docker="barueri-backend-mysql-1"

function wait_port {
    port=$1

    timeout 5 sh -c 'until nc -z localhost $0; do sleep 1; done' $port
    error=$?
    if [[ $error -eq 124 ]]; then
        echo "unable to connect to $port"
        exit $?
    fi
}

function wait_mysql {
    count=0
    {
        while ! docker exec -it $mysql_docker mysql -u barueri -pbarueri -e ";"; do
            ((count=count+1))
            if [[ $count -eq 20 ]]; then
                echo "unable to connect to mysql"
                exit 124
            fi
            sleep 1
        done
    } &> /dev/null
}

wait_mysql

wait_port 9324
wait_port 9325

wait_port 8080

serverless config credentials -o --profile barueri-offline --provider aws --key S3RVER --secret S3RVER
