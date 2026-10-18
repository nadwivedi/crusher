export const getUserFeatureAccess = (user) => ({
  saleReturn: true,
  stockAdjustment: true,
  // Enterprise: switched on by the CrusherBook admin
  weighbridge: Boolean(user?.featureAccess?.weighbridge)
});

export const hasFeatureAccess = (user, featureKey) => Boolean(getUserFeatureAccess(user)[featureKey]);

export const isFeaturePathVisible = () => true;

export const filterRestrictedItems = (items) => (items || []);
