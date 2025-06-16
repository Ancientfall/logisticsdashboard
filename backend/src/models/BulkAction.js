const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BulkAction = sequelize.define('BulkAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    uploadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Uploads',
        key: 'id'
      }
    },
    vesselName: {
      type: DataTypes.STRING,
      field: 'vessel_name'
    },
    voyageNumber: {
      type: DataTypes.STRING,
      field: 'voyage_number'
    },
    manifestNumber: {
      type: DataTypes.STRING,
      field: 'manifest_number'
    },
    manifestDate: {
      type: DataTypes.DATEONLY,
      field: 'manifest_date'
    },
    from: {
      type: DataTypes.STRING
    },
    to: {
      type: DataTypes.STRING
    },
    cargoType: {
      type: DataTypes.STRING,
      field: 'cargo_type'
    },
    cargoDescription: {
      type: DataTypes.TEXT,
      field: 'cargo_description'
    },
    quantity: {
      type: DataTypes.FLOAT
    },
    unit: {
      type: DataTypes.STRING
    },
    weight: {
      type: DataTypes.FLOAT
    },
    volume: {
      type: DataTypes.FLOAT
    },
    costCode: {
      type: DataTypes.STRING,
      field: 'cost_code'
    },
    projectCode: {
      type: DataTypes.STRING,
      field: 'project_code'
    },
    department: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    actionType: {
      type: DataTypes.STRING,
      field: 'action_type'
    },
    completedDate: {
      type: DataTypes.DATE,
      field: 'completed_date'
    },
    remarks: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'bulk_actions',
    timestamps: true,
    underscored: true
  });

  BulkAction.associate = (models) => {
    BulkAction.belongsTo(models.Upload, { 
      foreignKey: 'uploadId',
      as: 'upload'
    });
  };

  return BulkAction;
};