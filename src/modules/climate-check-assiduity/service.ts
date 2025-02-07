import {BarueriConfig} from 'config';
import OrgChartsService from 'modules/orgchart/service';
import {User} from 'modules/users/schema';
import moment from 'moment';

import ClimateCheckAssiduityRepository from './repository';

export default class ClimateCheckAssiduityService {

    static config(config: BarueriConfig, account: string, user: User, sectorQuery: any = null) {
        return new ClimateCheckAssiduityService(
            ClimateCheckAssiduityRepository.config(config, account),
            OrgChartsService.config(config, user, account, sectorQuery),
            account,
        );
    }

    async assiduityOnPeriod(sectorId: string, from: moment.Moment, to: moment.Moment) {
        const list = await this.repository.list(sectorId, from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));

        const assiduityArr = list.map(l => l.assiduity);

        const flatEmployees = assiduityArr.flatMap(assiduity => [...Object.keys(assiduity)]);
        const allEmployeesOnPeriod = flatEmployees.filter((item, index) => flatEmployees.indexOf(item) === index);

        const assiduityOnPeriod: {[employee: string]: string} = {};
        for (const employee of allEmployeesOnPeriod) {
            const all = assiduityArr.map(o => o[employee]).filter(v => v !== undefined);
            const completed = all.filter(v => !!v);
            assiduityOnPeriod[employee] = (completed.length / all.length * 100).toFixed(2);
        }

        return assiduityOnPeriod;
    }

    constructor(
        private repository: ClimateCheckAssiduityRepository,
        private sectors: OrgChartsService,
        private account: string,
    ) {}
}
