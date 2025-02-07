import {FeedbackStatus, validateFeedbackStatusOnCreateParams} from './schema';
import FeedbacksService from './service';

(() => {
    const params: validateFeedbackStatusOnCreateParams = {
        employeeIsManagerAbove: false,
        userIsManagerAbove: false,
        userIsSubordinateBelow: false,
        userSectorIsDiferentOfEmployeeUserSector: false,
    };

    describe('Handle the status of a new feedback', () => {
        it('Do not need approval when are from distincts sectors', () => {
            const paramsToBeApprovedWhenDistinctSectors = params;
            expect(FeedbacksService.validateFeedbackStatusOnCreate(paramsToBeApprovedWhenDistinctSectors)).toBe(FeedbackStatus.approved);
        });

        it('Is approved when send to manager above in the same sector', () => {
            const paramsToBeApprovedWhenIsManagerAbove = {
                ...params,
                isManageAbove: true,
            };
            expect(FeedbacksService.validateFeedbackStatusOnCreate(paramsToBeApprovedWhenIsManagerAbove)).toBe(FeedbackStatus.approved);
        });

        it('Is approved when send to subordinate below in the same sector', () => {
            const paramsToBeApprovedWhenSubordinateInTheSameSector = {
                ...params,
                userIsSubordinateBelow: true,
            };
            expect(FeedbacksService.validateFeedbackStatusOnCreate(paramsToBeApprovedWhenSubordinateInTheSameSector)).toBe(FeedbackStatus.approved);
        });

        it('Is approved when send to employee that is the sector manager', () => {
            const paramsToBeApprovedWhenEmployeeIsTheManager = {
                ...params,
                employeeIsManagerAbove: true,
            };
            expect(FeedbacksService.validateFeedbackStatusOnCreate(paramsToBeApprovedWhenEmployeeIsTheManager)).toBe(FeedbackStatus.approved);
        });

        it('Is pendding when send to employee of another sector', () => {
            const paramsToBeApprovedWhenEmployeeIsTheManager = {
                ...params,
                userSectorIsDiferentOfEmployeeUserSector: true,
            };
            expect(FeedbacksService.validateFeedbackStatusOnCreate(paramsToBeApprovedWhenEmployeeIsTheManager)).toBe(FeedbackStatus.pending_approval);
        });
    });
})();
