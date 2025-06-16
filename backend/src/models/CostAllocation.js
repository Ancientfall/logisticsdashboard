const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CostAllocation = sequelize.define('CostAllocation', {
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
    lcNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'lc_number'
    },
    rigReference: {
      type: DataTypes.STRING,
      field: 'rig_reference'
    },
    description: {
      type: DataTypes.TEXT
    },
    costElement: {
      type: DataTypes.STRING,
      field: 'cost_element'
    },
    monthYear: {
      type: DataTypes.STRING,
      field: 'month_year'
    },
    mission: {
      type: DataTypes.STRING
    },
    projectType: {
      type: DataTypes.STRING,
      field: 'project_type'
    },
    allocatedDays: {
      type: DataTypes.FLOAT,
      field: 'allocated_days'
    },
    avgVesselCostPerDay: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'avg_vessel_cost_per_day'
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'total_cost'
    },
    rigLocation: {
      type: DataTypes.STRING,
      field: 'rig_location'
    },
    rigType: {
      type: DataTypes.STRING,
      field: 'rig_type'
    },
    waterDepth: {
      type: DataTypes.STRING,
      field: 'water_depth'
    },
    department: {
      type: DataTypes.ENUM('Drilling', 'Production', 'Logistics'),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'cost_allocations',
    timestamps: true,
    underscored: true
  });

  CostAllocation.associate = (models) => {
    CostAllocation.belongsTo(models.Upload, { 
      foreignKey: 'uploadId',
      as: 'upload'
    });
  };

  return CostAllocation;
};