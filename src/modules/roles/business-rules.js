/* Atenção: esse arquivo é usado pelo local-authorizers.js e não suporta `import` */

export const RNs = [
    //Evaluations
    {'action': ['list', 'detail'], 'subject': 'Evaluation', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'type': {'$exists': true, '$eq': 'decision-matrix'}, 'disclosed_to_employee': {'$exists': true, '$ne': true}}, inverted: true},
    {'action': 'update', 'subject': 'Evaluation', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['read', 'status']}, //Editar campos read e status das proprias avaliacoes
    {'action': 'update', 'subject': 'Evaluation', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'type': {'$eq': 'Evaluation.DecisionMatrix'}}, 'fields': ['read', 'status'], inverted: true}, //Usuário não pode editar campos read e status de matriz de decisão para ele mesmo

    //Suspensions
    {'action': ['list', 'detail'], 'subject': 'Suspension', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'status': {'$exists': true, '$ne': 'SENT'}}, inverted: true},
    {'action': ['create', 'update', 'delete'], 'subject': 'Suspension', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, inverted: true},

    //Reprimands
    {'action': ['list', 'detail'], 'subject': 'Reprimand', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'status': {'$exists': true, '$ne': 'SENT'}}, inverted: true},
    {'action': ['create', 'update', 'delete'], 'subject': 'Reprimand', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, inverted: true},

    //Topics
    {'action': 'update', 'subject': 'Topic', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['progress']},

    //Async Task
    {'action': 'detail', 'subject': 'AsyncTask'},

    //Coaching Register
    {'action': 'update', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['read']},
    {'action': 'create', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'inverted': true},
    {'action': 'detail', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    {'action': 'list', 'subject': 'CoachingRegister', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    {'action': 'update', 'subject': 'CoachingRegisterTodo', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['completed_at']},

    //Climate Check
    {'action': ['list', 'create'], 'subject': 'ClimateCheck', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    {'action': ['list', 'detail'], 'subject': 'ClimateCheck', 'conditions': {'employee': {'$exists': true, '$nin': ['me', '${user.id}']}}, 'inverted': true},

    //Feedbacks
    {'action': 'update', 'subject': 'Feedback', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, inverted: true}},
    {'action': ['list', 'detail'], 'subject': 'Feedback', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'status': {'$exists': true, '$ne': 'approved'}}, inverted: true},

    //Basic permissions
    {'action': 'detail', 'subject': 'User', 'conditions': {'id': {'$in': ['me', '${user.id}']}}}, //Detalhar meus próprios detalhes
    {'action': 'update', 'subject': 'User', 'conditions': {'id': {'$in': ['me', '${user.id}']}}, fields: ['password']}, //Update da minha senha

    {'action': 'list', 'subject': 'Timeline', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}}, //Listar itens da minha timeline
    {'action': 'list', 'subject': 'Timeline', 'conditions': {'employee': {'$in': ['me', '${user.id}']}, 'type': {'$eq': 'Evaluation.DecisionMatrix'}}, 'inverted': true},

    {'action': 'list', 'subject': 'Evaluation', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}}, //Listar minhas próprias avaliações
    {'action': 'detail', 'subject': 'Evaluation', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}}, //Detalhar minhas próprias avaliações
    {'action': 'detail', 'subject': 'Evaluation', 'conditions': {'responsible': {'$in': ['me', '${user.id}']}}}, //Detalhar avaliações que eu sou responsável
    {'action': 'update', 'subject': 'Evaluation', 'conditions': {'responsible': {'$in': ['me', '${user.id}']}}}, //Atualizar avaliações que eu sou responsável

    {'action': 'list', 'subject': 'Employee', fields: ['id', 'sector', 'name', 'rank', 'roles', 'disabled', 'email', 'mobile_phone', 'avatarUrl', 'manager_of', 'sectors']}, //Listar colaboradores
    {'action': 'detail', 'subject': 'Employee', fields: ['id', 'sector', 'name', 'rank', 'roles', 'disabled', 'email', 'mobile_phone', 'avatarUrl', 'manager_of', 'sectors']}, //Detalhar colaboradores
    {'action': 'update', 'subject': 'Employee', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['avatarUrl']}, //Atualizar própria foto de perfil

    {'action': 'list', 'subject': 'PendingAction', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},

    {'action': ['list', 'detail', 'create'], 'subject': 'TrainingProgress', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},

    {'action': 'detail', 'subject': 'Content'},

    {'action': 'list', 'subject': 'Configuration'},
    {'action': 'detail', 'subject': 'Configuration'},

    {'action': 'manage', 'subject': 'Onboarding'},

    {'action': 'list', 'subject': 'UnseenItem', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},
    {'action': 'detail', 'subject': 'UnseenItem', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}},

    {'action': 'list', 'subject': 'Topic'},
    {'action': 'detal', 'subject': 'Topic'},

];

export const adminRNs = [
    {'action': 'update', 'subject': 'Employee', 'conditions': {'employee': {'$in': ['me', '${user.id}']}}, 'fields': ['avatarUrl']},
    {'action': 'manage', 'subject': 'Onboarding'},
    {'action': 'detail', 'subject': 'AsyncTask'},
    {'action': 'update', 'subject': 'User', 'conditions': {'id': '${account.responsible}'}, 'inverted': true},

];
