ALLOWED_TRANSITIONS = {
    'draft': ['review'],
    'review': ['fact_check', 'rejected'],
    'fact_check': ['legal', 'rejected'],
    'legal': ['approved', 'rejected'],
    'approved': ['scheduled'],
    'scheduled': ['published'],
    'published': ['archived'],
}
