const Sequelize = require('sequelize');
const DB = require('../Config/databaseConnect');

const User = DB.define('users', {
    id: { type: Sequelize.UUID, primaryKey: true},
    first_name: { type: Sequelize.STRING, allowNull: false },
    last_name: { type: Sequelize.STRING, allowNull: false },
    password: { type: Sequelize.STRING, allowNull: false },
    username: { type: Sequelize.STRING, unique: true, allowNull: false },
    account_created: { type: Sequelize.DATE, allowNull: false },
    account_updated: { type: Sequelize.DATE, allowNull: false },
}, {
    createdAt: 'account_created',
    updatedAt: 'account_updated',
    freezeTableName: true
});

module.exports = User;