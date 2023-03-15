export type MetaplexAnchorNft = {
  version: "0.1.0";
  name: "metaplex_anchor_nft";
  instructions: [
    {
      name: "mintNft";
      accounts: [
        {
          name: "treasury";
          isMut: true;
          isSigner: false;
        },
        {
          name: "sourceVideoStatsAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintAuthority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "metadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "masterEdition";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "videoId";
          type: "string";
        },
        {
          name: "creatorKey";
          type: "publicKey";
        },
        {
          name: "uri";
          type: "string";
        },
        {
          name: "title";
          type: "string";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "sourceVideoStats";
      type: {
        kind: "struct";
        fields: [
          {
            name: "previousNumberClipPurchases";
            type: "u8";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "initialized";
            type: "bool";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "NotEnoughFundsToPurchaseNft";
      msg: "Not enough funds to purchase the NFT";
    },
    {
      code: 6001;
      name: "DataTooLarge";
      msg: "Silly error that is silly";
    },
    {
      code: 6002;
      name: "DebuggingError";
      msg: "DEBUGGING - THIS ERROR IS STRICTLY FOR DEBUGGING PURPOSES";
    }
  ];
};

export const IDL: MetaplexAnchorNft = {
  version: "0.1.0",
  name: "metaplex_anchor_nft",
  instructions: [
    {
      name: "mintNft",
      accounts: [
        {
          name: "treasury",
          isMut: true,
          isSigner: false,
        },
        {
          name: "sourceVideoStatsAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintAuthority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "videoId",
          type: "string",
        },
        {
          name: "creatorKey",
          type: "publicKey",
        },
        {
          name: "uri",
          type: "string",
        },
        {
          name: "title",
          type: "string",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "sourceVideoStats",
      type: {
        kind: "struct",
        fields: [
          {
            name: "previousNumberClipPurchases",
            type: "u8",
          },
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "initialized",
            type: "bool",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "NotEnoughFundsToPurchaseNft",
      msg: "Not enough funds to purchase the NFT",
    },
    {
      code: 6001,
      name: "DataTooLarge",
      msg: "Silly error that is silly",
    },
    {
      code: 6002,
      name: "DebuggingError",
      msg: "DEBUGGING - THIS ERROR IS STRICTLY FOR DEBUGGING PURPOSES",
    },
  ],
};
