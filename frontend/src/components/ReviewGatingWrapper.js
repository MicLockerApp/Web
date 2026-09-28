import React from 'react';

// The old "must review before continuing" gate used an endpoint the app
// backend doesn't have. Reviews happen on the order page instead (buyer
// confirms delivery with a rating), same as the apps.
const ReviewGatingWrapper = ({ children }) => <>{children}</>;

export default ReviewGatingWrapper;
