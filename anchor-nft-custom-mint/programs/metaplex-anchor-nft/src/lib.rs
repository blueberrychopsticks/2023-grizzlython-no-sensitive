use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token;
use anchor_spl::token::{MintTo, Token};
use mpl_token_metadata::instruction::{create_master_edition_v3, create_metadata_accounts_v2};
use std::convert::TryInto;

declare_id!("Fa6gZQAMkyvekgiTVivnAiTKXKvAuhHzeb5SZ2puMerz");

#[account]
pub struct SourceVideoStats {
    previous_number_clip_purchases: u8, // 1 byte
    bump: u8,                           // 1 byte
    initialized: bool,                  // 1 byte
}

#[derive(Accounts)]
#[instruction(video_id:String)]
pub struct MintNFT<'info> {
    /// CHECK: We ensure through constraint that this is the treasury account
    #[account(
        mut,
        constraint = treasury.key.to_string() == "9P5ZvpucqtaMqGD9LrwmxqZJvELKrehApri4GCCYt6f7"
    )]
    pub treasury: AccountInfo<'info>,
    // TODO: ensure that accounts not owned by this program cannot be passed. I think Anchor does
    // this for us but it is definitely an attack vector.
    // Account that will hold pricing metadata for a source video for clips
    #[account(
        init_if_needed,
        seeds = [b"video_stats_v4", video_id.as_bytes()],
        bump,
        payer = payer,
        space = 8 + 1 + 1 + 1,
    )]
    pub source_video_stats_account: Account<'info, SourceVideoStats>,

    // TODO: This has to be very insecure but I'm getting it working for the hackahton
    // AUDIT and do in a not stupid way - ideally reading these from a PDA to check if they are
    // the correct accounts
    // pub account1: Option<AccountInfo<'info>>,
    // pub account2: Option<AccountInfo<'info>>,
    // pub account3: Option<AccountInfo<'info>>,
    // pub account4: Option<AccountInfo<'info>>,
    // pub account5: Option<AccountInfo<'info>>,
    // pub account6: Option<AccountInfo<'info>>,
    // pub account7: Option<AccountInfo<'info>>,
    // pub account8: Option<AccountInfo<'info>>,
    // pub account9: Option<AccountInfo<'info>>,
    // pub account10: Option<AccountInfo<'info>>,
    // pub account11: Option<AccountInfo<'info>>,
    // pub account12: Option<AccountInfo<'info>>,
    // pub account13: Option<AccountInfo<'info>>,
    // pub account14: Option<AccountInfo<'info>>,

    // For some reason, I can only pass 14 accounts right now and that's fine
    // TODO: account lookup tables
    // pub account15: Option<AccountInfo<'info>>,
    // pub account16: Option<AccountInfo<'info>>,
    // pub account17: Option<AccountInfo<'info>>,
    // pub account18: Option<AccountInfo<'info>>,
    // The code above this line is utterly preposterous - it's a hackathon sue me
    // TODO: This has to be very insecure but I'm getting it working for the hackahton


    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub payer: AccountInfo<'info>,

    #[account(mut)]
    pub mint_authority: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub rent: AccountInfo<'info>,

    // #[account(mut)]
    pub token_program: Program<'info, Token>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_metadata_program: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: Program<'info, System>,
}

#[program]
pub mod metaplex_anchor_nft {
    use anchor_lang::solana_program;
    use super::*;

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        video_id: String,
        creator_key: Pubkey,
        uri: String,
        title: String,
    ) -> Result<()> {


        let hard_coded_treasury_share = 0.5;
        let hard_coded_dividends_share = 0.5;
        msg!("Hard coded (to be DAO'd) treasury share: {}", hard_coded_treasury_share);
        msg!("Hard coded (to be DAO'd) dividend share: {}", hard_coded_dividends_share);

        msg!(
            "Checking video stats account for video with ID {}",
            video_id
        );
        let video_stats_account = &mut ctx.accounts.source_video_stats_account;
        msg!(
            "Video stats account without init: {}",
            video_stats_account.key()
        );
        if !video_stats_account.initialized {
            msg!(
                "Video with ID {} has not been initialized, initializing now",
                { video_id }
            );
            video_stats_account.previous_number_clip_purchases = 0;
            video_stats_account.initialized = true;
        }
        let previous_clip_purchases = video_stats_account.previous_number_clip_purchases;
        // Start price at .01 SOL
        let hard_coded_base_price_todo_dao_it_up: u64 = 10_000_000;
        /* TODO: safe math but cost shouldn't get that high or we're like, billionaires */
        let mint_cost_lamports: u64 = hard_coded_base_price_todo_dao_it_up * u64::pow(2, previous_clip_purchases.into());
        msg!("Previous clip purchases: {}", previous_clip_purchases);
        msg!("SOL base price per clip: {}", hard_coded_base_price_todo_dao_it_up);
        msg!(
            "Calculated lamports price for this clip: {}",
            mint_cost_lamports
        );

        // getting here on devnet March 12
        // return err!(MyError::DebuggingError);

        // Check if payer has enough SOL balance
        msg!("Checking user balance, they must have at least {} lamports", mint_cost_lamports);
        let payer_balance: u64 = ctx.accounts.payer.to_account_info().lamports();

        if payer_balance < mint_cost_lamports.try_into().unwrap() {
            msg!(
                "Insufficient funds to mint NFT ({} required, {} available)",
                mint_cost_lamports,
                payer_balance
            );
            return err!(MyError::NotEnoughFundsToPurchaseNft);
        }

            msg!("This is the first clip purchase for this video, sending 100% of funds to treasury");
            let source_account = ctx.accounts.payer.to_account_info();
            let treasury = ctx.accounts.treasury.to_account_info();
            let treasury_share = mint_cost_lamports as u64/* When first purchase, all funds go to treasury as f64 * hard_coded_treasury_share) as u64*/;

            msg!(
            "Transferring {} lamports to treasury account {}", treasury_share, treasury.key
        );
            let treasury_transfer_instruction = solana_program::system_instruction::transfer(
                source_account.key,
                treasury.key,
                treasury_share,
            );

            let treasury_transfer_ix_accounts = vec![source_account.clone(), treasury.clone()];

            msg!(
            "Attempting to transfer {} lamports to {}",
            mint_cost_lamports,
            treasury.key
        );
            invoke(&treasury_transfer_instruction, &treasury_transfer_ix_accounts)?;
            msg!("Treasury transfer successful");


        // msg!(
        //     "Beginning dividend distribution in the most hacky way possible"
        // );
        // let dividend_share_to_be_distributed_equally_amongst_all_previous_clip_pol_purchasers = (mint_cost_lamports as f64 * hard_coded_dividends_share) as u64;
        // msg!(
        //     "Dividend share to be distributed equally amongst all <COUNT> previous clip POL purchasers: {}",
        //     dividend_share_to_be_distributed_equally_amongst_all_previous_clip_pol_purchasers
        // );


        // let maybe_accounts: Vec<&Option<AccountInfo>> = vec![
        //  &ctx.accounts.account1,
        //  &ctx.accounts.account2,
        //  &ctx.accounts.account3,
        //  &ctx.accounts.account4,
        //  &ctx.accounts.account5,
        //  &ctx.accounts.account6,
        //  &ctx.accounts.account7,
        //  &ctx.accounts.account8,
        //  &ctx.accounts.account9,
        //  &ctx.accounts.account10,
        //  &ctx.accounts.account11,
        //  &ctx.accounts.account12,
        //  &ctx.accounts.account13,
        //  &ctx.accounts.account14,
        //  // &ctx.accounts.account15,
        //  // &ctx.accounts.account16,
        //  // &ctx.accounts.account17,
        //  // &ctx.accounts.account18,
        // ];
        //
        // let dividend_recipients: Vec<&AccountInfo> = maybe_accounts
        //     .iter()
        //     .filter(|maybe_account| maybe_account.is_some())
        //     .map(|maybe_account| maybe_account.as_ref().unwrap())
        //     .collect();
        // //
        //
        // let dividend_recipients_count: u64 = dividend_recipients.len() as u64;
        // msg!("Dividend recipients count: {}", dividend_recipients_count);
        //
        // /////////////////////////////////////////////////////////////////////////////
        // // // // // WAS WORKING
        // /////////////////////////////////////////////////////////////////////////////
        //
        // // getting here on devnet March 12
        // // return err!(MyError::DebuggingError);
        //
        //
        // if dividend_recipients_count == 0 {
        //     msg!("This is the first clip purchase for this video, sending 100% of funds to treasury");
        //     let source_account = ctx.accounts.payer.to_account_info();
        //     let treasury = ctx.accounts.treasury.to_account_info();
        //     let treasury_share = mint_cost_lamports as u64/* When first purchase, all funds go to treasury as f64 * hard_coded_treasury_share) as u64*/;
        //
        //     msg!(
        //     "Transferring {} lamports to treasury account {}", treasury_share, treasury.key
        // );
        //     let treasury_transfer_instruction = solana_program::system_instruction::transfer(
        //         source_account.key,
        //         treasury.key,
        //         treasury_share,
        //     );
        //
        //     let treasury_transfer_ix_accounts = vec![source_account.clone(), treasury.clone()];
        //
        //     msg!(
        //     "Attempting to transfer {} lamports to {}",
        //     mint_cost_lamports,
        //     treasury.key
        // );
        //     // invoke(&treasury_transfer_instruction, &treasury_transfer_ix_accounts)?;
        //     msg!("Treasury transfer successful");
        // } else {
        //     let source_account = ctx.accounts.payer.to_account_info();
        //
        //     msg!("About to do the following division: {} / {}", dividend_share_to_be_distributed_equally_amongst_all_previous_clip_pol_purchasers, dividend_recipients_count);
        //     let dividend_share_per_recipient: u64 = dividend_share_to_be_distributed_equally_amongst_all_previous_clip_pol_purchasers / dividend_recipients_count;
        //     msg!("Dividend recipients count: {}", dividend_recipients_count);
        //     msg!("Dividend share per recipient: {}", dividend_share_per_recipient);
        //     msg!("Note: This account number maybe be smaller than the number of total previous clip POL purchasers, as some accounts may not have been passed in to this Transaction.");
        //     msg!("We will fix this in the future by storing the previous purchases in a PDA");
        //     msg!("TODO: I don't believe we even need to pass in accounts that we're only transferring assets to.");
        //
        //     for dividend_recipient in dividend_recipients {
        //         msg!(
        //             "Attempting to transfer {} lamports to {}",
        //             dividend_share_per_recipient,
        //             dividend_recipient.key
        //         );
        //         let dividend_transfer_instruction = solana_program::system_instruction::transfer(
        //             source_account.key,
        //             dividend_recipient.key,
        //             dividend_share_per_recipient,
        //         );
        //
        //         let dividend_transfer_ix_accounts = vec![source_account.clone(), dividend_recipient.clone()];
        //
        //         invoke(&dividend_transfer_instruction, &dividend_transfer_ix_accounts)?;
        //         msg!("Dividend transfer to {} for {} lamports successful", dividend_recipient.key, dividend_share_per_recipient);
        //     }
        // }
        //
        // // getting here on devnet March 12
        // // return err!(MyError::DebuggingError);


        msg!("Initializing Mint Ticket");
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        msg!("CPI Accounts Assigned");
        let cpi_program = ctx.accounts.token_program.to_account_info();
        msg!("CPI Program Assigned");
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        msg!("CPI Context Assigned");
        token::mint_to(cpi_ctx, 1)?;
        msg!("Token Minted !!!");
        let account_info = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        msg!("Account Info Assigned");
        let creator = vec![
            mpl_token_metadata::state::Creator {
                address: creator_key,
                verified: false,
                share: 100,
            },
            mpl_token_metadata::state::Creator {
                address: ctx.accounts.mint_authority.key(),
                verified: false,
                share: 0,
            },
        ];
        msg!("Creator Assigned");
        let symbol = std::string::ToString::to_string("POL");
        // the below transaction is failing
        // return err!(MyError::DebuggingError);

        invoke(
            &create_metadata_accounts_v2(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.payer.key(),
                ctx.accounts.payer.key(),
                title,
                symbol,
                uri,
                Some(creator),
                1,
                true,
                false,
                None,
                None,
            ),
            account_info.as_slice(),
        )?;

        msg!("Metadata Account Created !!!");
        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];

        msg!("Master Edition Account Infos Assigned");
        invoke(
            &create_master_edition_v3(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.master_edition.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.payer.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.payer.key(),
                Some(0),
            ),
            master_edition_infos.as_slice(),
        )?;
        msg!("Master Edition Nft Minted !!!");

        video_stats_account.previous_number_clip_purchases = previous_clip_purchases + 1;

        msg!("Previous Clip Purchases Updated !!! from {} to {}", previous_clip_purchases, video_stats_account.previous_number_clip_purchases);

        Ok(())
    }
}

// An enum for custom error codes
#[error_code]
pub enum MyError {
    #[msg("Not enough funds to purchase the NFT")]
    NotEnoughFundsToPurchaseNft,
    #[msg("Silly error that is silly")]
    DataTooLarge,
    #[msg("DEBUGGING - THIS ERROR IS STRICTLY FOR DEBUGGING PURPOSES")]
    DebuggingError,
}
