import express from 'express';
import permissionMiddleware from 'middlewares/permission';

import config from '../../config';
import account from '../../middlewares/account';
import authorizer from '../../middlewares/authorizer';
import RolesService from '../../modules/roles/service';
import asyncTasks from './async-tasks/router';
import coachingRegisters from './coaching-registers/router';
import configurations from './configuration/router';
import dismissInterviews from './dismiss-interviews/router';
import employees from './employees/router';
import evaluations from './evaluations/router';
import faqs from './faqs/router';
import feedbacks from './feedbacks/router';
import jobVacancies from './job-vacancies/router';
import managers from './managers/router';
import newsFeed from './news-feed/router';
import notes from './notes/router';
import onboarding from './onboarding/router';
import orgchart from './orgchart/router';
import ranks from './ranks/router';
import reprimands from './reprimands/router';
import roles from './roles/router';
import suspensions from './suspensions/router';
import templates from './templates/router';
import trainingTrails from './training-trails/router';
import trainings from './trainings/router';
import tutorials from './tutorials/router';
import users from './users/router';

const router = express.Router();
export default router;

router.use(account);

router.use(authorizer);
router.use(permissionMiddleware);

router.use('/users', users);
router.use('/users/me/onboarding', onboarding);
router.use('/sectors', orgchart);
router.use('/employees', employees);
router.use('/evaluations', evaluations);
router.use('/feedbacks', feedbacks);
router.use('/ranks', ranks);
router.use('/templates', templates);
router.use('/training-trails', trainingTrails);
router.use('/trainings', trainings);
router.use('/notes', notes);
router.use('/faqs', faqs);
router.use('/tutorials', tutorials);
router.use('/async-tasks', asyncTasks);
router.use('/managers', managers);
router.use('/coaching-registers', coachingRegisters);
router.use('/suspensions', suspensions);
router.use('/reprimands', reprimands);
router.use('/dismiss-interviews', dismissInterviews);
router.use('/configurations', configurations);
router.use('/job-vacancies', jobVacancies);
router.use('/news-feed', newsFeed);
router.use('/roles', roles);

router.get('/roles', async (req, res) => {
    const {user, account: acc} = res.locals;
    const result = await RolesService.config(config, user, acc)
        .list();

    res.send(result);
});
