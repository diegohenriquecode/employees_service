import {Context, SQSEvent} from 'aws-lambda';
import {User} from 'modules/users/schema';
import UsersService from 'modules/users/service';

import config from '../../config';
import {DDBStreamEvent} from '../../utils/dynamo-client';
import subscriptionHandler from '../../utils/subscriptions';
import {NotImplemented} from '../errors/errors';
import {Sector} from './schema';
import OrgChartsService from './service';

export const handler = (event: SQSEvent, context: Context) => subscriptionHandler<DDBStreamEvent<Sector>>(event, context, _handler);

async function _handler(payload: DDBStreamEvent<Sector>) {
    if (payload.EventType === 'MODIFY' && payload.OldItem && payload.NewItem) {
        const {OldItem, NewItem} = payload;

        const users = UsersService.config(config, {id: NewItem.updated_by} as User, NewItem?.account);
        const sectors = OrgChartsService.config(config, {id: NewItem.updated_by} as User, NewItem.account);

        const managerChanged = OldItem.manager !== NewItem.manager;
        const pathChanged = OldItem.path !== NewItem.path;
        if (managerChanged && pathChanged) {
            throw new NotImplemented();
        } else if (managerChanged) {
            if (OldItem.manager) {
                if (!NewItem.manager) {
                    const toUpdate = await sectors.list(OldItem.id);
                    await users.updateSubordinateTo(
                        OldItem.manager,
                        OldItem.id,
                        (await sectors.managersSectorFor(OldItem, true)).id,
                        toUpdate.map(s => s.id),
                    );
                }
                await users
                    .removeManagerFromSector(OldItem, (await sectors.managersSectorFor(NewItem, false)).id);
            }
            if (NewItem.manager) {
                if (!OldItem.manager) {
                    const toUpdate = await sectors.list(OldItem.id);
                    await users.updateSubordinateTo(
                        NewItem.manager,
                        (await sectors.managersSectorFor(OldItem, true)).id,
                        NewItem.id,
                        toUpdate.map(s => s.id),
                    );
                }
                await users
                    .setAsManager(NewItem, (await sectors.managersSectorFor(NewItem, true)).id);
            }
        } else if (pathChanged) {
            if (NewItem.manager) {
                await users
                    .setSubordinateTo(NewItem, (await sectors.managersSectorFor(NewItem, true)).id);
            } else {
                await users.updateSubordinateTo(
                    null,
                    (await sectors.managersSectorFor(OldItem, false)).id,
                    (await sectors.managersSectorFor(NewItem, false)).id,
                    [NewItem.id],
                );
            }
        }
    }
}
