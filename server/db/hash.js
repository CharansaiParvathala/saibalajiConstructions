const bcrypt = require('bcryptjs');
console.log('admin:', bcrypt.hashSync('$2a$10$oIh7PtlTy3wVFJHBkCu5ZOMhoqbo4qwwN.0lb7va1Fm3dbQRNwl0O', 10));
console.log('owner:', bcrypt.hashSync('owner123', 10));
console.log('checker:', bcrypt.hashSync('checker123', 10));