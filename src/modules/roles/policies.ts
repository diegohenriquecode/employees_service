import {Permission} from './rolesConverter';

const Policies: Record<string, PolicyInfo> = {
    USER__READ: {permissions: ['USER__LIST', 'USER__DETAIL'], group: 'USER'},
    USER__MANAGE: {permissions: ['USER__LIST', 'USER__DETAIL', 'USER__CREATE', 'USER__UPDATE', 'USER__DELETE'], group: 'USER'},

    ORGCHART__READ: {permissions: ['SECTOR__LIST', 'SECTOR__DETAIL'], group: 'ORGCHART'},
    ORGCHART__MANAGE: {permissions: ['SECTOR__LIST', 'SECTOR__DETAIL', 'SECTOR__CREATE', 'SECTOR__UPDATE', 'SECTOR__DELETE'], group: 'ORGCHART'},

    RANK__READ: {permissions: ['RANK__LIST', 'RANK__DETAIL'], group: 'RANK'},
    RANK__MANAGE: {permissions: ['RANK__LIST', 'RANK__DETAIL', 'RANK__CREATE', 'RANK__UPDATE', 'RANK__DELETE'], group: 'RANK'},

    ROLE__READ: {permissions: ['ROLE__LIST', 'ROLE__DETAIL'], group: 'ROLE'},
    ROLE__MANAGE: {permissions: ['ROLE__LIST', 'ROLE__DETAIL', 'ROLE__CREATE', 'ROLE__UPDATE', 'ROLE__DELETE'], group: 'ROLE'},

    EMPLOYEE__READ: {permissions: ['EMPLOYEE__LIST__COMPLETE', 'EMPLOYEE__DETAIL__COMPLETE'], group: 'EMPLOYEE'},
    EMPLOYEE__MANAGE: {permissions: ['EMPLOYEE__LIST__COMPLETE', 'EMPLOYEE__DETAIL__COMPLETE', 'EMPLOYEE__UPDATE'], group: 'EMPLOYEE'},
    EMPLOYEE__TIMELINE_READ: {permissions: ['TIMELINE__LIST'], group: 'EMPLOYEE'},

    FEEDBACK__CREATE: {permissions: ['FEEDBACK__CREATE'], group: 'FEEDBACK'},
    FEEDBACK__READ: {permissions: ['FEEDBACK__LIST__COMPLETE', 'FEEDBACK__DETAIL__COMPLETE'], group: 'FEEDBACK'},

    COACHING_REGISTER__CREATE: {permissions: ['COACHING_REGISTER__CREATE'], group: 'COACHING_REGISTER'},
    COACHING_REGISTER__READ: {permissions: ['COACHING_REGISTER__LIST', 'COACHING_REGISTER__DETAIL'], group: 'COACHING_REGISTER'},

    REPRIMAND__READ: {permissions: ['REPRIMAND__LIST', 'REPRIMAND__DETAIL'], group: 'REPRIMAND'},
    REPRIMAND__MANAGE: {permissions: ['REPRIMAND__LIST', 'REPRIMAND__DETAIL', 'REPRIMAND__CREATE', 'REPRIMAND__UPDATE', 'REPRIMAND__DELETE'], group: 'REPRIMAND'},

    SUSPENSION__READ: {permissions: ['SUSPENSION__LIST', 'SUSPENSION__DETAIL'], group: 'SUSPENSION'},
    SUSPENSION__MANAGE: {permissions: ['SUSPENSION__LIST', 'SUSPENSION__DETAIL', 'SUSPENSION__CREATE', 'SUSPENSION__UPDATE', 'SUSPENSION__DELETE'], group: 'SUSPENSION'},

    TRAINING__READ: {permissions: ['TRAINING__LIST', 'TRAINING__DETAIL', 'TRAINING_PROGRESS__LIST', 'ROLE__LIST'], group: 'TRAINING'},
    TRAINING__MANAGE: {permissions: ['TRAINING__LIST', 'TRAINING__DETAIL', 'TRAINING_PROGRESS__LIST', 'TRAINING__CREATE', 'TRAINING__UPDATE', 'TRAINING__DELETE', 'ROLE__LIST'], group: 'TRAINING'},

    TRAIL__READ: {permissions: ['TRAIL__LIST', 'TRAIL__DETAIL'], group: 'TRAIL'},
    TRAIL__MANAGE: {permissions: ['TRAIL__LIST', 'TRAIL__DETAIL', 'TRAIL__CREATE', 'TRAIL__UPDATE', 'TRAIL__DELETE'], group: 'TRAIL'},

    EVALUATION__READ: {permissions: ['EVALUATION__LIST', 'EVALUATION__DETAIL'], group: 'EVALUATION'},
    EVALUATION__MANAGE: {permissions: ['EVALUATION__LIST', 'EVALUATION__DETAIL', 'EVALUATION__CREATE', 'EVALUATION__UPDATE', 'EVALUATION__DELETE'], group: 'EVALUATION'},

    EVALUATIONS_SCHEDULER__READ: {permissions: ['EVALUATIONS_SCHEDULER__LIST', 'EVALUATIONS_SCHEDULER__DETAIL'], group: 'EVALUATIONS_SCHEDULER'},
    EVALUATIONS_SCHEDULER__MANAGE: {permissions: ['EVALUATIONS_SCHEDULER__LIST', 'EVALUATIONS_SCHEDULER__DETAIL', 'EVALUATIONS_SCHEDULER__CREATE', 'EVALUATIONS_SCHEDULER__UPDATE', 'EVALUATIONS_SCHEDULER__DELETE'], group: 'EVALUATIONS_SCHEDULER'},

    CLIMATE__HISTORY_READ: {permissions: ['CLIMATE_CHECK__LIST', 'CLIMATE_HISTORY__DETAIL'], group: 'CLIMATE'},

    VACATION__READ: {permissions: ['VACATION__LIST', 'VACATION__DETAIL'], group: 'VACATION'},
    VACATION__MANAGE: {permissions: ['VACATION__LIST', 'VACATION__DETAIL', 'VACATION__CREATE', 'VACATION__UPDATE', 'VACATION__DELETE'], group: 'VACATION'},

    DISMISS_INTERVIEW__READ: {permissions: ['DISMISS_INTERVIEW__LIST', 'DISMISS_INTERVIEW__DETAIL'], group: 'DISMISS_INTERVIEW'},
    DISMISS_INTERVIEW__MANAGE: {permissions: ['DISMISS_INTERVIEW__LIST', 'DISMISS_INTERVIEW__DETAIL', 'DISMISS_INTERVIEW__CREATE', 'DISMISS_INTERVIEW__UPDATE', 'DISMISS_INTERVIEW__DELETE'], group: 'DISMISS_INTERVIEW'},

    ABSENCE__READ: {permissions: ['ABSENCE__LIST', 'ABSENCE__DETAIL'], group: 'ABSENCE'},
    ABSENCE__MANAGE: {permissions: ['ABSENCE__LIST', 'ABSENCE__DETAIL', 'ABSENCE__CREATE', 'ABSENCE__UPDATE', 'ABSENCE__DELETE'], group: 'ABSENCE'},

    NEWS_FEED__READ: {permissions: ['NEWS_FEED__LIST', 'NEWS_FEED__DETAIL'], group: 'NEWS_FEED'},
    NEWS_FEED__MANAGE: {permissions: ['NEWS_FEED__LIST', 'NEWS_FEED__DETAIL', 'NEWS_FEED__CREATE', 'NEWS_FEED__UPDATE', 'NEWS_FEED__DELETE'], group: 'NEWS_FEED'},
};

export default Policies;

export type Policy = keyof typeof Policies;

interface PolicyInfo {
    permissions: Permission[];
    group: string;
}
