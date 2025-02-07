import {Context, SQSEvent} from 'aws-lambda';
import {AppUser, User} from 'modules/users/schema';
import {DDBStreamEvent} from 'utils/dynamo-client';
import subscriptionHandler from 'utils/subscriptions';

import config from '../../../config';
import UsersHierarchicalService from '../service';

export const handler = (event: SQSEvent, context: Context) => subscriptionHandler<DDBStreamEvent<User>>(event, context, _handler);

async function _handler(payload: DDBStreamEvent<User>) {
    const {OldItem, NewItem} = payload;
    await UsersHierarchicalService.config(config, {id: 'sub-hierarchical'} as AppUser, OldItem?.account || NewItem?.account || 'sub_hierarchical_user')
        .handleUserNewVersion(payload.EventType, OldItem, NewItem);
}
