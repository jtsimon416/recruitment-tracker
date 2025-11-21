export const STAGES = {
    SCREENING: 'Screening',
    SUBMIT_TO_CLIENT: 'Submit to Client',
    INTERVIEW_1: 'Interview 1',
    INTERVIEW_2: 'Interview 2',
    INTERVIEW_3: 'Interview 3',
    OFFER: 'Offer',
    HIRED: 'Hired',
    ARCHIVED: 'Archived'
};

export const STATUSES = {
    ACTIVE: 'Active',
    HOLD: 'Hold',
    REJECT: 'Reject'
};

export const PIPELINE_STAGES_ORDER = [
    STAGES.SCREENING,
    STAGES.SUBMIT_TO_CLIENT,
    STAGES.INTERVIEW_1,
    STAGES.INTERVIEW_2,
    STAGES.INTERVIEW_3,
    STAGES.OFFER,
    STAGES.HIRED
];

export const PIPELINE_STATUSES_LIST = [
    STATUSES.ACTIVE,
    STATUSES.HOLD,
    STATUSES.REJECT
];
