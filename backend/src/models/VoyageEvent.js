const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VoyageEvent = sequelize.define('VoyageEvent', {
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
    mission: {
      type: DataTypes.STRING,
      allowNull: false
    },
    event: {
      type: DataTypes.STRING,
      allowNull: false
    },
    parentEvent: {
      type: DataTypes.STRING,
      field: 'parent_event'
    },
    location: {
      type: DataTypes.STRING
    },
    quay: {
      type: DataTypes.STRING
    },
    remarks: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    from: {
      type: DataTypes.STRING
    },
    to: {
      type: DataTypes.STRING
    },
    hours: {
      type: DataTypes.FLOAT
    },
    portType: {
      type: DataTypes.STRING,
      field: 'port_type'
    },
    eventCategory: {
      type: DataTypes.STRING,
      field: 'event_category'
    },
    year: {
      type: DataTypes.INTEGER
    },
    ins500m: {
      type: DataTypes.BOOLEAN,
      field: 'ins_500m'
    },
    costDedicatedTo: {
      type: DataTypes.STRING,
      field: 'cost_dedicated_to'
    },
    vessel: {
      type: DataTypes.STRING
    },
    voyageNumber: {
      type: DataTypes.STRING,
      field: 'voyage_number'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'voyage_events',
    timestamps: true,
    underscored: true
  });

  VoyageEvent.associate = (models) => {
    VoyageEvent.belongsTo(models.Upload, { 
      foreignKey: 'uploadId',
      as: 'upload'
    });
  };

  return VoyageEvent;
};