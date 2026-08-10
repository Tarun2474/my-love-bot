import { Markup } from 'telegraf';

export const Keyboards = {
  welcome: Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Start', 'btn_start'), Markup.button.callback('ℹ️ About Bot', 'btn_about')],
    [Markup.button.callback('📢 Announcement', 'btn_announcement'), Markup.button.callback('🔒 Privacy Policy', 'btn_privacy')]
  ]),

  genderSelection: Markup.inlineKeyboard([
    [Markup.button.callback('♂️ Male', 'gen_male'), Markup.button.callback('♀️ Female', 'gen_female')],
    [Markup.button.callback('⚧️ Other', 'gen_other')]
  ]),

  ageConfirmation: Markup.inlineKeyboard([
    [Markup.button.callback('🔞 Yes, I am 18+', 'age_yes'), Markup.button.callback('🚫 No, I am below 18', 'age_no')]
  ]),

  saveProfile: Markup.inlineKeyboard([
    [Markup.button.callback('💾 Save Profile', 'btn_save_profile')]
  ]),

  editProfileInline: Markup.inlineKeyboard([
    [Markup.button.callback('✏️ Edit Profile Form', 'edit_profile_start')]
  ]),

  editGenderSelection: Markup.inlineKeyboard([
    [Markup.button.callback('♂️ Male', 'edit_gen_male'), Markup.button.callback('♀️ Female', 'edit_gen_female')],
    [Markup.button.callback('⚧️ Other', 'edit_gen_other')]
  ]),

  mainMenu: Markup.keyboard([
    ['❤️ New Love', '👤 Profile'],
    ['🔍 Filter', '✏️ Edit Profile'],
    ['📢 Announcement', '🔒 Privacy Policy'],
    ['📞 Contact Us', '©️ Copyright'],
    ['🔄 Restart', '🗑 Delete Account']
  ]).resize(),

  chatActive: Markup.keyboard([
    ['🛑 Chat End', '🚨 Report']
  ]).resize(),

  afterChat: Markup.inlineKeyboard([
    [Markup.button.callback('👍 Like', 'rate_like'), Markup.button.callback('👎 Dislike', 'rate_dislike')],
    [Markup.button.callback('❤️ New Love', 'btn_new_love')]
  ]),

  filterMenu: Markup.inlineKeyboard([
    [Markup.button.callback('♂️ Male', 'filt_male'), Markup.button.callback('♀️ Female', 'filt_female')],
    [Markup.button.callback('⚧️ Other', 'filt_other'), Markup.button.callback('🌐 All', 'filt_all')]
  ]),

  deleteConfirmation: Markup.inlineKeyboard([
    [Markup.button.callback('🗑 Yes, Delete', 'del_yes'), Markup.button.callback('❌ Cancel', 'del_no')]
  ])
};