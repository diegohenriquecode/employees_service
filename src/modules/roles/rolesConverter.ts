import config from 'config';

export const permissionConverter = {
    EMPLOYEE__LIST__COMPLETE: {'action': 'list', 'subject': 'Employee'},
    EMPLOYEE__DETAIL__COMPLETE: {'action': 'detail', 'subject': 'Employee'},
    EMPLOYEE__UPDATE: {'action': 'update', 'subject': 'Employee'},
    EMPLOYEE__DETAIL__SUMMARY: {'action': 'detail', 'subject': 'Employee', fields: ['id', 'sector', 'name', 'rank', 'roles', 'disabled', 'email', 'mobile_phone', 'avatarUrl', 'manager_of', 'sectors']},
    EMPLOYEE__LIST__SUMMARY: {'action': 'list', 'subject': 'Employee', fields: ['id', 'sector', 'name', 'rank', 'roles', 'disabled', 'email', 'mobile_phone', 'avatarUrl', 'manager_of', 'sectors']},
    EMPLOYEE__DETAIL__WORKING_DAYS: {'action': 'detail', 'subject': 'Employee', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}, 'fields': ['working_days']},

    FEEDBACK__LIST__COMPLETE: {'action': 'list', 'subject': 'Feedback'},
    FEEDBACK__DETAIL__COMPLETE: {'action': 'detail', 'subject': 'Feedback'},
    FEEDBACK__CREATE: {'action': 'create', 'subject': 'Feedback', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    FEEDBACK__LIST__CREATED_BY_ME: {'action': 'list', 'subject': 'Feedback', 'conditions': {'created_by': {'$in': ['${user.id}']}}},
    FEEDBACK__DETAIL__CREATED_BY_ME: {'action': 'detail', 'subject': 'Feedback', 'conditions': {'created_by': {'$in': ['${user.id}']}}},
    FEEDBACK__LIST__SENT_TO_ME: {'action': 'list', 'subject': 'Feedback', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    FEEDBACK__DETAIL__SENT_TO_ME: {'action': 'detail', 'subject': 'Feedback', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    FEEDBACK__READ__SENT_TO_ME: {'action': 'update', 'subject': 'Feedback', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['read']},
    FEEDBACK__LIST__SUBORDINATES: {'action': 'list', 'subject': 'Feedback', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    FEEDBACK__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'Feedback', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    FEEDBACK__APPROVE__SUBORDINATES: {'action': 'update', 'subject': 'Feedback', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}, 'fields': ['status']},

    REPRIMAND__LIST: {'action': 'list', 'subject': 'Reprimand'},
    REPRIMAND__CREATE: {'action': 'create', 'subject': 'Reprimand'},
    REPRIMAND__DETAIL: {'action': 'detail', 'subject': 'Reprimand'},
    REPRIMAND__UPDATE: {'action': 'update', 'subject': 'Reprimand'},
    REPRIMAND__DELETE: {'action': 'delete', 'subject': 'Reprimand'},
    REPRIMAND__LIST__SENT_TO_ME: {'action': 'list', 'subject': 'Reprimand', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    REPRIMAND__DETAIL__SENT_TO_ME: {'action': 'detail', 'subject': 'Reprimand', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    REPRIMAND__MANAGE__SUBORDINATES: {'action': 'manage', 'subject': 'Reprimand', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    SUSPENSION__LIST: {'action': 'list', 'subject': 'Suspension'},
    SUSPENSION__CREATE: {'action': 'create', 'subject': 'Suspension'},
    SUSPENSION__DETAIL: {'action': 'detail', 'subject': 'Suspension'},
    SUSPENSION__UPDATE: {'action': 'update', 'subject': 'Suspension'},
    SUSPENSION__DELETE: {'action': 'delete', 'subject': 'Suspension'},
    SUSPENSION__LIST__SENT_TO_ME: {'action': 'list', 'subject': 'Suspension', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    SUSPENSION__DETAIL__SENT_TO_ME: {'action': 'detail', 'subject': 'Suspension', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    SUSPENSION__LIST__SUBORDINATES: {'action': 'list', 'subject': 'Suspension', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    SUSPENSION__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'Suspension', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    NOTE__CREATE: {'action': 'create', 'subject': 'Note'},

    TUTORIAL__LIST: {'action': 'list', 'subject': 'Tutorial'},
    TUTORIAL__DETAIL: {'action': 'detail', 'subject': 'Tutorial'},

    FAQ__LIST: {'action': 'list', 'subject': 'Faq'},

    TRAINING__LIST: {'action': 'list', 'subject': 'Training'},
    TRAINING__CREATE: {'action': 'create', 'subject': 'Training'},
    TRAINING__UPDATE: {'action': 'update', 'subject': 'Training'},
    TRAINING__DETAIL: {'action': 'detail', 'subject': 'Training'},
    TRAINING__DELETE: {'action': 'delete', 'subject': 'Training'},

    TRAIL__LIST: {'action': 'list', 'subject': 'TrainingTrail'},
    TRAIL__CREATE: {'action': 'create', 'subject': 'TrainingTrail'},
    TRAIL__UPDATE: {'action': 'update', 'subject': 'TrainingTrail'},
    TRAIL__DETAIL: {'action': 'detail', 'subject': 'TrainingTrail'},
    TRAIL__DELETE: {'action': 'delete', 'subject': 'TrainingTrail'},
    TRAIL__LIST__SENT_TO_ME: {'action': 'list', 'subject': 'TrainingTrail', 'conditions': {'employee': {'$exists': true, '$in': ['me', '${user.id}']}}},
    TRAIL__DETAIL__SENT_TO_ME: {'action': 'detail', 'subject': 'TrainingTrail', 'conditions': {'employee': {'$exists': true, '$in': ['me', '${user.id}']}}},

    SECTOR__LIST: {'action': 'list', 'subject': 'Sector'},
    SECTOR__CREATE: {'action': 'create', 'subject': 'Sector'},
    SECTOR__DETAIL: {'action': 'detail', 'subject': 'Sector'},
    SECTOR__UPDATE: {'action': 'update', 'subject': 'Sector'},
    SECTOR__DELETE: {'action': 'delete', 'subject': 'Sector'},

    USER__LIST: {'action': 'list', 'subject': 'User'},
    USER__CREATE: {'action': 'create', 'subject': 'User'},
    USER__DETAIL: {'action': 'detail', 'subject': 'User'},
    USER__UPDATE: {'action': 'update', 'subject': 'User'},
    USER__DELETE: {'action': 'delete', 'subject': 'User'},

    RANK__CREATE: {'action': 'create', 'subject': 'Rank'},
    RANK__LIST: {'action': 'list', 'subject': 'Rank'},
    RANK__DELETE: {'action': 'delete', 'subject': 'Rank'},
    RANK__DETAIL: {'action': 'detail', 'subject': 'Rank'},
    RANK__UPDATE: {'action': 'update', 'subject': 'Rank'},

    ROLE__LIST: {'action': 'list', 'subject': 'Role'},
    ROLE__CREATE: {'action': 'create', 'subject': 'Role'},
    ROLE__DETAIL: {'action': 'detail', 'subject': 'Role'},
    ROLE__UPDATE: {'action': 'update', 'subject': 'Role'},
    ROLE__DELETE: {'action': 'delete', 'subject': 'Role'},

    HISTORY__LIST: {'action': 'list', 'subject': 'History'},
    HISTORY__DETAIL: {'action': 'detail', 'subject': 'History'},

    EVALUATION__LIST: {'action': 'list', 'subject': 'Evaluation', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    EVALUATION__CREATE: {'action': 'create', 'subject': 'Evaluation', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    EVALUATION__DETAIL: {'action': 'detail', 'subject': 'Evaluation', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    EVALUATION__UPDATE: {'action': 'update', 'subject': 'Evaluation', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    EVALUATION__DELETE: {'action': 'delete', 'subject': 'Evaluation', 'conditions': {'employee': {'$nin': ['me', '${user.id}']}}},
    EVALUATION__MANAGE__SUBORDINATES: {'action': 'manage', 'subject': 'Evaluation', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}, 'employee': {'$nin': ['me', '${user.id}']}}},

    EVALUATIONS_SCHEDULER__CREATE: {'action': 'create', 'subject': 'EvaluationsScheduler'},
    EVALUATIONS_SCHEDULER__LIST: {'action': 'list', 'subject': 'EvaluationsScheduler'},
    EVALUATIONS_SCHEDULER__UPDATE: {'action': 'update', 'subject': 'EvaluationsScheduler'},
    EVALUATIONS_SCHEDULER__DETAIL: {'action': 'detail', 'subject': 'EvaluationsScheduler'},
    EVALUATIONS_SCHEDULER__DELETE: {'action': 'delete', 'subject': 'EvaluationsScheduler'},

    EVALUATIONS_SCHEDULER__MANAGE__SUBORDINATES: {'action': 'manage', 'subject': 'EvaluationsScheduler', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    COACHING_REGISTER__LIST: {'action': 'list', 'subject': 'CoachingRegister'},
    COACHING_REGISTER__DETAIL: {'action': 'detail', 'subject': 'CoachingRegister'},
    COACHING_REGISTER__CREATE: {'action': 'create', 'subject': 'CoachingRegister'},
    COACHING_REGISTER__LIST__SUBORDINATES: {'action': 'list', 'subject': 'CoachingRegister', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    COACHING_REGISTER__CREATE__SUBORDINATES: {'action': 'create', 'subject': 'CoachingRegister', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    COACHING_REGISTER__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'CoachingRegister', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    COACHING_REGISTER__LIST__SENT_TO_ME: {'action': 'list', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    COACHING_REGISTER__DETAIL__SENT_TO_ME: {'action': 'detail', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},

    CLIMATE_CHECK__LIST: {'action': 'list', 'subject': 'ClimateCheck'},
    CLIMATE_CHECK__LIST__SUBORDINATES: {'action': 'list', 'subject': 'ClimateCheck', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    CLIMATE_CHECK__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'ClimateCheck', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    CLIMATE_HISTORY__DETAIL: {'action': 'detail', 'subject': 'ClimateCheck', 'fields': ['history']},
    CLIMATE_HISTORY__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'ClimateCheck', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}, 'fields': ['history']},

    TIMELINE__LIST: {'action': 'list', 'subject': 'Timeline'},
    TIMELINE__LIST__SUBORDINATES: {'action': 'list', 'subject': 'Timeline', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    VACATION__LIST: {'action': 'list', 'subject': 'Vacation'},
    VACATION__CREATE: {'action': 'create', 'subject': 'Vacation'},
    VACATION__DETAIL: {'action': 'detail', 'subject': 'Vacation'},
    VACATION__UPDATE: {'action': 'update', 'subject': 'Vacation'},
    VACATION__DELETE: {'action': 'delete', 'subject': 'Vacation'},

    TRAINING_PROGRESS__LIST: {'action': 'list', 'subject': 'TrainingProgress'},
    TRAINING_PROGRESS__MANAGE: {'action': 'manage', 'subject': 'TrainingProgress'},

    TEMPLATE__LIST: {'action': 'list', 'subject': 'Template'},
    TEMPLATE__CREATE: {'action': 'create', 'subject': 'Template'},
    TEMPLATE__DETAIL: {'action': 'detail', 'subject': 'Template'},
    TEMPLATE__UPDATE: {'action': 'update', 'subject': 'Template'},
    TEMPLATE__DELETE: {'action': 'delete', 'subject': 'Template'},

    DISMISS_INTERVIEW__LIST: {'action': 'list', 'subject': 'DismissInterview'},
    DISMISS_INTERVIEW__CREATE: {'action': 'create', 'subject': 'DismissInterview'},
    DISMISS_INTERVIEW__UPDATE: {'action': 'update', 'subject': 'DismissInterview'},
    DISMISS_INTERVIEW__DETAIL: {'action': 'detail', 'subject': 'DismissInterview'},
    DISMISS_INTERVIEW__DELETE: {'action': 'delete', 'subject': 'DismissInterview'},
    DISMISS_INTERVIEW__LIST__SUBORDINATES: {'action': 'list', 'subject': 'DismissInterview', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    ABSENCE__LIST: {'action': 'list', 'subject': 'Absence'},
    ABSENCE__CREATE: {'action': 'create', 'subject': 'Absence'},
    ABSENCE__DETAIL: {'action': 'detail', 'subject': 'Absence'},
    ABSENCE__UPDATE: {'action': 'update', 'subject': 'Absence'},
    ABSENCE__DELETE: {'action': 'delete', 'subject': 'Absence'},

    TRAINING_PROGRESS__LIST__SUBORDINATES: {'action': 'list', 'subject': 'TrainingProgress', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},
    TRAINING_PROGRESS__DETAIL__SUBORDINATES: {'action': 'detail', 'subject': 'TrainingProgress', 'conditions': {'sector': {'$in': '${user.sector.descendants}'}}},

    CONFIGURATION__MANAGE: {'action': 'manage', 'subject': 'Configuration'},

    MANAGE__LIST: {'action': 'list', 'subject': 'Manager'},

    CONTENT__MANAGE: {'action': 'manage', 'subject': 'Content'},

    TOPIC__MANAGE: {'action': 'manage', 'subject': 'Topic'},
    TOPIC__LIST: {'action': 'list', 'subject': 'Topic'},
    TOPIC__DETAIL: {'action': 'detail', 'subject': 'Topic'},

    NEWS_FEED__CREATE: {'action': 'create', 'subject': 'NewsFeed'},
    NEWS_FEED__UPDATE: {'action': 'update', 'subject': 'NewsFeed'},
    NEWS_FEED__DETAIL: {'action': 'detail', 'subject': 'NewsFeed'},
    NEWS_FEED__LIST: {'action': 'list', 'subject': 'NewsFeed'},
    NEWS_FEED__DELETE: {'action': 'delete', 'subject': 'NewsFeed'},

    NEWS_FEED_COMMENT__CREATE: {'action': 'create', 'subject': 'NewsFeedComment'},
    NEWS_FEED_COMMENT__LIST: {'action': 'list', 'subject': 'NewsFeedComment'},
    NEWS_FEED_COMMENT__DELETE: {'action': 'delete', 'subject': 'NewsFeedComment'},
    NEWS_FEED_COMMENT__DELETE__BY_ME: {'action': 'delete', 'subject': 'NewsFeedComment', 'conditions': {'created_by': {'$in': ['${user.id}']}}},

    JOB_VACANCIES__LIST: {'action': 'list', 'subject': 'JobVacancy'},
    JOB_VACANCIES__CREATE: {'action': 'create', 'subject': 'JobVacancy'},
    JOB_VACANCIES__DETAIL: {'action': 'detail', 'subject': 'JobVacancy'},
    JOB_VACANCIES__UPDATE: {'action': 'update', 'subject': 'JobVacancy'},
    JOB_VACANCIES__DELETE: {'action': 'delete', 'subject': 'JobVacancy'},
};

export const permissionTypes: Record<Permission, string> = Object.keys(permissionConverter).reduce((acc, v) => ({...acc, [v]: `${v}`}), {});

export type Permission = keyof typeof permissionConverter;

export const convertPermission = (permission: string): any => {
    return permissionConverter[permission as Permission];
};

export const basicPermissions = [
    permissionTypes.FAQ__LIST,

    permissionTypes.SECTOR__LIST,
    permissionTypes.SECTOR__DETAIL,

    permissionTypes.TRAINING__LIST,
    permissionTypes.TRAINING__DETAIL,

    permissionTypes.COACHING_REGISTER__LIST__SENT_TO_ME,
    permissionTypes.COACHING_REGISTER__DETAIL__SENT_TO_ME,

    permissionTypes.TRAIL__LIST__SENT_TO_ME,
    permissionTypes.TRAIL__DETAIL__SENT_TO_ME,

    permissionTypes.FEEDBACK__LIST__SENT_TO_ME,
    permissionTypes.FEEDBACK__DETAIL__SENT_TO_ME,
    permissionTypes.FEEDBACK__LIST__CREATED_BY_ME,
    permissionTypes.FEEDBACK__DETAIL__CREATED_BY_ME,
    permissionTypes.FEEDBACK__READ__SENT_TO_ME,
    permissionTypes.FEEDBACK__CREATE,

    permissionTypes.TUTORIAL__LIST,
    permissionTypes.TUTORIAL__DETAIL,

    permissionTypes.TOPIC__LIST,
    permissionTypes.TOPIC__DETAIL,

    permissionTypes.SUSPENSION__LIST__SENT_TO_ME,
    permissionTypes.SUSPENSION__DETAIL__SENT_TO_ME,

    permissionTypes.REPRIMAND__LIST__SENT_TO_ME,
    permissionTypes.REPRIMAND__DETAIL__SENT_TO_ME,

    permissionTypes.NEWS_FEED__DETAIL,
    permissionTypes.NEWS_FEED__LIST,
    // permissionTypes.NEWS_FEED__DELETE,

    permissionTypes.NEWS_FEED_COMMENT__CREATE,
    permissionTypes.NEWS_FEED_COMMENT__LIST,
    permissionTypes.NEWS_FEED_COMMENT__DELETE__BY_ME,

    permissionTypes.EMPLOYEE__LIST__SUMMARY,
    permissionTypes.EMPLOYEE__DETAIL__SUMMARY,

    permissionTypes.USER__DETAIL,

    permissionTypes.RANK__DETAIL,

    permissionTypes.TEMPLATE__LIST,
    permissionTypes.TEMPLATE__DETAIL,

    permissionTypes.NOTE__CREATE,

    permissionTypes.FAQ__LIST,
];

export const permissionsByRole = {
    admin: [
        permissionTypes.FAQ__LIST,

        permissionTypes.USER__LIST,
        permissionTypes.USER__DETAIL,
        permissionTypes.USER__CREATE,
        permissionTypes.USER__UPDATE,

        permissionTypes.TUTORIAL__LIST,
        permissionTypes.TUTORIAL__DETAIL,

        permissionTypes.SECTOR__LIST,
        permissionTypes.SECTOR__CREATE,
        permissionTypes.SECTOR__DETAIL,
        permissionTypes.SECTOR__UPDATE,
        permissionTypes.SECTOR__DELETE,

        permissionTypes.RANK__CREATE,
        permissionTypes.RANK__LIST,
        permissionTypes.RANK__DELETE,
        permissionTypes.RANK__DETAIL,
        permissionTypes.RANK__UPDATE,

        permissionTypes.TRAINING__LIST,
        permissionTypes.TRAINING__CREATE,
        permissionTypes.TRAINING__UPDATE,
        permissionTypes.TRAINING__DETAIL,
        permissionTypes.TRAINING__DELETE,

        permissionTypes.TRAIL__LIST,
        permissionTypes.TRAIL__CREATE,
        permissionTypes.TRAIL__DETAIL,
        permissionTypes.TRAIL__UPDATE,
        permissionTypes.TRAIL__DELETE,

        permissionTypes.CONFIGURATION__MANAGE,

        ...(
            config.featureFlags.roles ? [
                permissionTypes.ROLE__LIST,
                permissionTypes.ROLE__CREATE,
                permissionTypes.ROLE__DETAIL,
                permissionTypes.ROLE__UPDATE,
                permissionTypes.ROLE__DELETE,
            ] : [permissionTypes.ROLE__LIST]
        ),

        permissionTypes.NOTE__CREATE,

        permissionTypes.CONTENT__MANAGE,
        permissionTypes.TOPIC__MANAGE,

        permissionTypes.MANAGE__LIST,

        permissionTypes.EMPLOYEE__DETAIL__SUMMARY,
        permissionTypes.EMPLOYEE__LIST__SUMMARY,
    ],

    rh: [
        permissionTypes.HISTORY__LIST,
        permissionTypes.HISTORY__DETAIL,

        permissionTypes.SECTOR__LIST,
        permissionTypes.SECTOR__CREATE,
        permissionTypes.SECTOR__DETAIL,
        permissionTypes.SECTOR__UPDATE,
        permissionTypes.SECTOR__DELETE,

        permissionTypes.EMPLOYEE__LIST__COMPLETE,
        permissionTypes.EMPLOYEE__DETAIL__COMPLETE,
        permissionTypes.EMPLOYEE__UPDATE,

        permissionTypes.RANK__LIST,
        permissionTypes.RANK__CREATE,
        permissionTypes.RANK__DETAIL,
        permissionTypes.RANK__DELETE,
        permissionTypes.RANK__UPDATE,

        permissionTypes.FEEDBACK__LIST__COMPLETE,
        permissionTypes.FEEDBACK__DETAIL__COMPLETE,

        permissionTypes.EVALUATION__LIST,
        permissionTypes.EVALUATION__CREATE,
        permissionTypes.EVALUATION__DETAIL,
        permissionTypes.EVALUATION__UPDATE,
        permissionTypes.EVALUATION__DELETE,

        permissionTypes.COACHING_REGISTER__LIST,
        permissionTypes.COACHING_REGISTER__DETAIL,
        permissionTypes.COACHING_REGISTER__CREATE,

        permissionTypes.CLIMATE_CHECK__LIST,
        permissionTypes.CLIMATE_HISTORY__DETAIL,

        permissionTypes.TIMELINE__LIST,

        permissionTypes.REPRIMAND__LIST,
        permissionTypes.REPRIMAND__CREATE,
        permissionTypes.REPRIMAND__DETAIL,
        permissionTypes.REPRIMAND__UPDATE,
        permissionTypes.REPRIMAND__DELETE,

        permissionTypes.SUSPENSION__LIST,
        permissionTypes.SUSPENSION__CREATE,
        permissionTypes.SUSPENSION__DETAIL,
        permissionTypes.SUSPENSION__UPDATE,
        permissionTypes.SUSPENSION__DELETE,

        permissionTypes.EVALUATIONS_SCHEDULER__CREATE,
        permissionTypes.EVALUATIONS_SCHEDULER__LIST,
        permissionTypes.EVALUATIONS_SCHEDULER__UPDATE,
        permissionTypes.EVALUATIONS_SCHEDULER__DETAIL,
        permissionTypes.EVALUATIONS_SCHEDULER__DELETE,

        permissionTypes.VACATION__LIST,
        permissionTypes.VACATION__CREATE,
        permissionTypes.VACATION__DETAIL,
        permissionTypes.VACATION__UPDATE,
        permissionTypes.VACATION__DELETE,

        permissionTypes.TRAINING_PROGRESS__MANAGE,

        permissionTypes.TEMPLATE__LIST,
        permissionTypes.TEMPLATE__CREATE,
        permissionTypes.TEMPLATE__DETAIL,
        permissionTypes.TEMPLATE__UPDATE,
        permissionTypes.TEMPLATE__DELETE,

        permissionTypes.DISMISS_INTERVIEW__LIST,
        permissionTypes.DISMISS_INTERVIEW__CREATE,
        permissionTypes.DISMISS_INTERVIEW__UPDATE,
        permissionTypes.DISMISS_INTERVIEW__DETAIL,
        permissionTypes.DISMISS_INTERVIEW__DELETE,

        permissionTypes.MANAGE__LIST,

        permissionTypes.ABSENCE__LIST,
        permissionTypes.ABSENCE__CREATE,
        permissionTypes.ABSENCE__DETAIL,
        permissionTypes.ABSENCE__UPDATE,
        permissionTypes.ABSENCE__DELETE,

        permissionTypes.NEWS_FEED__CREATE,
        permissionTypes.NEWS_FEED__UPDATE,
        permissionTypes.NEWS_FEED__DETAIL,
        permissionTypes.NEWS_FEED__LIST,
        permissionTypes.NEWS_FEED__DELETE,

        permissionTypes.NEWS_FEED_COMMENT__DELETE,

        permissionTypes.JOB_VACANCIES__LIST,
        permissionTypes.JOB_VACANCIES__CREATE,
        permissionTypes.JOB_VACANCIES__DETAIL,
        permissionTypes.JOB_VACANCIES__UPDATE,
        permissionTypes.JOB_VACANCIES__DELETE,

        permissionTypes.TRAIL__LIST,
        ...basicPermissions,
    ],
    employee: [
        ...basicPermissions,
    ],
    manager: [
        ...basicPermissions,
        permissionTypes.FEEDBACK__LIST__SUBORDINATES,
        permissionTypes.FEEDBACK__DETAIL__SUBORDINATES,
        permissionTypes.FEEDBACK__APPROVE__SUBORDINATES,

        permissionTypes.COACHING_REGISTER__DETAIL__SUBORDINATES,
        permissionTypes.COACHING_REGISTER__LIST__SUBORDINATES,
        permissionTypes.COACHING_REGISTER__CREATE__SUBORDINATES,

        permissionTypes.EVALUATION__MANAGE__SUBORDINATES,

        permissionTypes.CLIMATE_CHECK__LIST__SUBORDINATES,
        permissionTypes.CLIMATE_CHECK__DETAIL__SUBORDINATES,
        permissionTypes.CLIMATE_HISTORY__DETAIL__SUBORDINATES,

        permissionTypes.TIMELINE__LIST__SUBORDINATES,
        permissionTypes.REPRIMAND__MANAGE__SUBORDINATES,
        permissionTypes.SUSPENSION__LIST__SUBORDINATES,
        permissionTypes.SUSPENSION__DETAIL__SUBORDINATES,

        permissionTypes.DISMISS_INTERVIEW__LIST__SUBORDINATES,

        permissionTypes.EVALUATIONS_SCHEDULER__MANAGE__SUBORDINATES,

        permissionTypes.TRAINING_PROGRESS__LIST__SUBORDINATES,
        permissionTypes.TRAINING_PROGRESS__DETAIL__SUBORDINATES,
        permissionTypes.EMPLOYEE__DETAIL__WORKING_DAYS,
    ],
};
