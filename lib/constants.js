/**
 * CycloPon Application Constants & Enums
 */

const RIDER_COLORS = [
  '#00E5FF', '#FF6B35', '#3FB950', '#F78166', '#D2A8FF',
  '#FFA657', '#79C0FF', '#56D364', '#FF7B72', '#E3B341',
  '#58A6FF', '#BC8CFF', '#FFB86C', '#50FA7B', '#FF79C6'
];

const ROLE_COLORS = {
  sweeper:  '#F97316', // Vibrant Sweeper Orange
  marshall: '#3B82F6', // Marshall Blue
  medic:    '#EF4444'  // Emergency Medic Red
};

function determineColorForRole(role, existingCount = 0) {
  const cleanRole = String(role || '').toLowerCase();
  if (ROLE_COLORS[cleanRole]) {
    return ROLE_COLORS[cleanRole];
  }
  return RIDER_COLORS[existingCount % RIDER_COLORS.length];
}

module.exports = {
  RIDER_COLORS,
  ROLE_COLORS,
  determineColorForRole
};

