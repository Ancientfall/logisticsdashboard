const { DataTypes } = require('sequelize')

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('password_resets', {
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true
			},
			userId: {
				type: DataTypes.UUID,
				allowNull: false,
				references: {
					model: 'Users',
					key: 'id'
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE'
			},
			token: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true
			},
			expiresAt: {
				type: DataTypes.DATE,
				allowNull: false
			},
			used: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			}
		})

		// Add indexes
		await queryInterface.addIndex('password_resets', ['token'])
		await queryInterface.addIndex('password_resets', ['userId'])
		await queryInterface.addIndex('password_resets', ['expiresAt'])
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.dropTable('password_resets')
	}
}