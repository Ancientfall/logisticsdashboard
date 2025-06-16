const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VoyageList = sequelize.define('VoyageList', {
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
      allowNull: false,
      field: 'vessel_name'
    },
    voyageNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'voyage_number'
    },
    voyageType: {
      type: DataTypes.STRING,
      field: 'voyage_type'
    },
    departurePort: {
      type: DataTypes.STRING,
      field: 'departure_port'
    },
    departureDate: {
      type: DataTypes.DATEONLY,
      field: 'departure_date'
    },
    arrivalPort: {
      type: DataTypes.STRING,
      field: 'arrival_port'
    },
    arrivalDate: {
      type: DataTypes.DATEONLY,
      field: 'arrival_date'
    },
    voyageDuration: {
      type: DataTypes.FLOAT,
      field: 'voyage_duration',
      comment: 'Duration in days'
    },
    totalDistance: {
      type: DataTypes.FLOAT,
      field: 'total_distance',
      comment: 'Distance in nautical miles'
    },
    fuelConsumption: {
      type: DataTypes.FLOAT,
      field: 'fuel_consumption',
      comment: 'Fuel in metric tons'
    },
    cargoCapacity: {
      type: DataTypes.FLOAT,
      field: 'cargo_capacity'
    },
    cargoUtilization: {
      type: DataTypes.FLOAT,
      field: 'cargo_utilization',
      comment: 'Percentage of capacity used'
    },
    voyageStatus: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'planned',
      field: 'voyage_status'
    },
    charterer: {
      type: DataTypes.STRING
    },
    operator: {
      type: DataTypes.STRING
    },
    masterName: {
      type: DataTypes.STRING,
      field: 'master_name'
    },
    totalCrew: {
      type: DataTypes.INTEGER,
      field: 'total_crew'
    },
    voyagePurpose: {
      type: DataTypes.STRING,
      field: 'voyage_purpose'
    },
    totalRevenue: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'total_revenue'
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'total_cost'
    },
    profit: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'profit'
    },
    remarks: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'voyage_lists',
    timestamps: true,
    underscored: true
  });

  VoyageList.associate = (models) => {
    VoyageList.belongsTo(models.Upload, { 
      foreignKey: 'uploadId',
      as: 'upload'
    });
  };

  return VoyageList;
};