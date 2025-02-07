import RolesService from './service';

export default function decode(method: string, path: string) {
    const segments = path.split('/').filter(i => i);
    if (segments.length === 0) {
        return {};
    }
    return _decode(method, segments);
}

export function objectType(obj: any) {
    return obj?.__caslSubjectType__;
}

function _decode(method: string, segments: Array<string>, context: object, i = 0) {
    if (segments.length === 1) {
        const entity = Entities.find(e => e.segment === segments[0]);
        if (!entity) {
            if (i === 0) {
                return {};
            } else {
                const action = {POST: 'create', GET: 'detail', PUT: 'update', PATCH: 'update', DELETE: 'delete'}[method];
                return {action, field: segments[0]};
            }
        } else {
            const action = {GET: 'list', POST: 'create'}[method];
            const object = context ? RolesService.object(entity.object, context) : entity.object;
            return {action, object};
        }
    }
    if (segments.length > 1) {
        const [seg1, seg2, ...rest] = segments;
        const action = {POST: 'create', GET: 'detail', PUT: 'update', PATCH: 'update', DELETE: 'delete'}[method];
        const entity = Entities.find(e => e.segment === seg1);
        if (!entity) {
            return {};
        }

        const object = RolesService.object(entity.object, {...context, id: seg2});
        context = {...context, [entity.id]: seg2};

        if (rest.length > 0) {
            return {
                action,
                object,
                context,
                ..._decode(method, rest, context, i + 1),
            };
        }

        return {action, object, context};
    }
}

const Entities = [
    {segment: 'users', object: 'User', id: 'user'},
    {segment: 'employees', object: 'Employee', id: 'employee'},
    {segment: 'todos', object: 'CoachingRegisterTodo', id: 'coachingRegisterTodo'},
    {segment: 'evaluations-scheduler', object: 'EvaluationsScheduler', id: 'evaluationsScheduler'},
    {segment: 'sectors', object: 'Sector', id: 'sector'},
    {segment: 'ranks', object: 'Rank', id: 'rank'},
    {segment: 'roles', object: 'Role', id: 'role'},
    {segment: 'pending-actions', object: 'PendingAction', id: 'pendingAction'},
    {segment: 'timelines', object: 'Timeline', id: 'timeline'},
    {segment: 'history', object: 'History', id: 'history'},
    {segment: 'vacations', object: 'Vacation', id: 'vacation'},
    {segment: 'templates', object: 'Template', id: 'template'},
    {segment: 'tutorials', object: 'Tutorial', id: 'tutorial'},
    {segment: 'notes', object: 'Note', id: 'note'},
    {segment: 'faqs', object: 'Faq', id: 'faq'},
    {segment: 'onboarding', object: 'Onboarding', id: 'onboarding'},
    {segment: 'unseen-items', object: 'UnseenItem', id: 'unseenItem'},
    {segment: 'trainings', object: 'Training', id: 'training'},
    {segment: 'training-progresses', object: 'TrainingProgress', id: 'trainingProgress'},
    {segment: 'contents', object: 'Content', id: 'content'},
    {segment: 'topics', object: 'Topic', id: 'topic'},
    {segment: 'managers', object: 'Manager', id: 'manager'},
    {segment: 'async-tasks', object: 'AsyncTask', id: 'async-task'},
    {segment: 'absences', object: 'Absence', id: 'absence'},
    {segment: 'configurations', object: 'Configuration', id: 'configuration'},
    {segment: 'job-vacancies', object: 'JobVacancy', id: 'job-vacancy'},
    {segment: 'news-feed', object: 'NewsFeed', id: 'news-feed'},
    {segment: 'news-feed-comments', object: 'NewsFeedComments', id: 'news-feed-comments'},
];
