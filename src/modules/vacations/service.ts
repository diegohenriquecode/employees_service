import {BarueriConfig} from 'config';
import {ConflictError, NotFoundError} from 'modules/errors/errors';
import UsersRepository from 'modules/users/repository';
import {User} from 'modules/users/schema';
import moment from 'moment';

import VacationsRepository from './repository';
import {AbsenceType, CreateVacationProps, UpdateVacationProps, Vacation} from './schema';

export default class VacationsService {

    static config(cfg: BarueriConfig, user: User, account: string): VacationsService {
        return new VacationsService(
            VacationsRepository.config(cfg, user.id, account),
            UsersRepository.config(cfg, user.id, account),
        );
    }

    async create(employee: string, props: CreateVacationProps) {
        const {sector} = await this.getEmployee(employee);

        const vacations = await this.listByEmployee(employee);

        if (this.hasOverlap(props.start, props.end, vacations)) {
            throw new ConflictError();
        }

        return this.repository.create({
            ...props,
            sector,
            employee,
        });
    }

    async listByEmployee(employee: string) {
        return this.repository.listByEmployee(employee);
    }

    async listByType(employeeId: string, type?: AbsenceType) {
        const list = await this.listByEmployee(employeeId);
        return type ?
            list.filter(absence => absence.type === type)
            : list.filter(absence => absence.type !== AbsenceType.VACATION);
    }

    async retrieve(employee: string, id: string) {
        const vacation = await this.repository.retrieve(employee, id);

        if (!vacation) {
            throw new NotFoundError('Vacation not found');
        }

        return vacation;
    }

    async update(employee: string, id: string, props: UpdateVacationProps) {
        const current = await this.retrieve(employee, id);

        let vacations = await this.listByEmployee(employee);
        vacations = vacations.filter(vacation => vacation.id !== id);

        if (this.hasOverlap(props.start, props.end, vacations)) {
            throw new ConflictError();
        }

        return this.repository.update(current, props);
    }

    async delete(employee: string, id: string) {
        await this.repository.delete(employee, id);
    }

    private async getEmployee(employee: string) {
        const user = await this.users.retrieve(employee);
        if (!user) {
            throw new NotFoundError('Employee not found');
        }
        return user;
    }

    private hasOverlap(start: string | undefined, end: string | undefined, vacations: Vacation[]) {
        return vacations.some(vacation => {
            const startOverlap = start && moment(start).isSameOrBefore(moment(vacation.end)) && moment(start).isSameOrAfter(moment(vacation.start));
            const endOverlap = end && moment(end).isSameOrBefore(moment(vacation.end)) && moment(end).isSameOrAfter(moment(vacation.start));

            return startOverlap || endOverlap;
        });
    }

    constructor(
        private repository: VacationsRepository,
        private users: UsersRepository,
    ) {}
}
