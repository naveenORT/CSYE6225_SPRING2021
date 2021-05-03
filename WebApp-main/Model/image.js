const Sequelize = require('sequelize');
const DB = require('../Config/databaseConnect');

const Image = DB.define('book_image', {
    file_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    file_name: {type: Sequelize.STRING, allowNull: false},
    s3_obj_name:{ type: Sequelize.STRING, allowNull: false},
    original_filename: { type: Sequelize.STRING, allowNull: false },
    encoding: { type: Sequelize.STRING, allowNull: false },
    mimetype: { type: Sequelize.STRING, allowNull: false },
    'content-length': { type: Sequelize.STRING, allowNull: false },
    },{  
    createdAt: 'image_created',
    updatedAt: false,
    freezeTableName: true
});

module.exports = Image;