#!/usr/bin/env bash

if [[ "$#" -ne 3 ]]; then
    echo "Usage: ./barueri-backend/scripts/deploy.sh <aws-profile> <branch>" >&2
    exit 2
fi

profile=$1
branch=$2

set -e

cd ./barueri-backend
    git stash -u && git fetch && git checkout ${branch} && git rebase
    yarn
    yarn build:templates
    yarn serverless deploy -v --aws-profile ${profile}
    # yarn serverless invoke -v -f migrate --aws-profile ${profile}
cd ..

cd ./barueri-frontend
    git stash -u && git fetch && git checkout ${branch} && git rebase
    yarn
    ./scripts/build-upload.sh ${profile}
cd ..

cd ./barueri-frontend-admin
    git stash -u && git fetch && git checkout ${branch} && git rebase
    yarn
    ./scripts/build-upload.sh ${profile}
cd ..
