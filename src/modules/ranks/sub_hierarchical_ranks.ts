import {Context, SQSEvent} from 'aws-lambda';
import UsersHierarchicalService from 'modules/users-hierarchical/service';
import {AppUser} from 'modules/users/schema';
import {DDBStreamEvent} from 'utils/dynamo-client';
import subscriptionHandler from 'utils/subscriptions';

import config from '../../config';
import {Rank} from './schema';

export const handler = (event: SQSEvent, context: Context) => subscriptionHandler<DDBStreamEvent<Rank>>(event, context, _handler);

async function _handler(payload: DDBStreamEvent<Rank>) {
    const {OldItem, NewItem} = payload;
    await UsersHierarchicalService.config(config, {id: 'sub-hierarchical-rank'} as AppUser, OldItem?.account || NewItem?.account || 'sub_hierarchical_ranks')
        .handleRankNewVersion(payload.EventType, OldItem, NewItem);
}
