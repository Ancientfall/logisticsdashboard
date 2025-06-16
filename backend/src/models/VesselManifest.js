const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VesselManifest = sequelize.define('VesselManifest', {
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
    voyageId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'voyage_id'
    },
    manifestNumber: {
      type: DataTypes.STRING,
      field: 'manifest_number'
    },
    transporter: {
      type: DataTypes.STRING
    },
    type: {
      type: DataTypes.STRING
    },
    manifestDate: {
      type: DataTypes.DATEONLY,
      field: 'manifest_date'
    },
    costCode: {
      type: DataTypes.STRING,
      field: 'cost_code'
    },
    from: {
      type: DataTypes.STRING
    },
    offshoreLocation: {
      type: DataTypes.STRING,
      field: 'offshore_location'
    },
    deckLbs: {
      type: DataTypes.FLOAT,
      field: 'deck_lbs'
    },
    deckTons: {
      type: DataTypes.FLOAT,
      field: 'deck_tons'
    },
    rtTons: {
      type: DataTypes.FLOAT,
      field: 'rt_tons'
    },
    lifts: {
      type: DataTypes.INTEGER
    },
    wetBulkBbls: {
      type: DataTypes.FLOAT,
      field: 'wet_bulk_bbls'
    },
    wetBulkGals: {
      type: DataTypes.FLOAT,
      field: 'wet_bulk_gals'
    },
    deckSqft: {
      type: DataTypes.FLOAT,
      field: 'deck_sqft'
    },
    remarks: {
      type: DataTypes.TEXT
    },
    year: {
      type: DataTypes.INTEGER
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'vessel_manifests',
    timestamps: true,
    underscored: true
  });

  VesselManifest.associate = (models) => {
    VesselManifest.belongsTo(models.Upload, { 
      foreignKey: 'uploadId',
      as: 'upload'
    });
  };

  return VesselManifest;
};