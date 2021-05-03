const Sequelize = require('sequelize');
const DB = require('../Config/databaseConnect');

const Book = DB.define('books', {
    
    id: { type: Sequelize.UUID, primaryKey: true},
    title: { type: Sequelize.STRING, allowNull: false },
    author: { type: Sequelize.STRING, allowNull: false },
    isbn: { type: Sequelize.STRING, unique: true, allowNull: false },
    publish_date: { type: Sequelize.STRING, allowNull: false },
    user_id: { type: Sequelize.UUID, allowNull: false},
    book_created: {type: Sequelize.DATE, allowNull: false},
    },
    {  
    createdAt: 'book_created',
    updatedAt: false,
    freezeTableName: true
});


module.exports = Book;