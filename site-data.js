// The games, once. The collapsed covers, the rail down the right gutter and
// the chapter friezes all use this list, so adding another game stays one edit.
//
// id      the section's anchor          rule   which frieze motif it carries
// bg/ink/accent  the section's own ground, text and accent, for its rail tile
export const GAMES = [
  {
    id: "work", num: "01", name: "Bronze Hoof", rule: "bronze",
    bg: "#11110e", ink: "#eeede6", accent: "#e9c46a",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1194600/ss_2541116e7c8fbb4bb946e12b0d6755cecea50b38.1920x1080.jpg?t=1598633964",
  },
  {
    id: "boon-hill", num: "02", name: "Welcome to Boon Hill", rule: "boon",
    compact: true,
    bg: "#565a76", ink: "#f0ece2", accent: "#b69ab6", detail: "#1d1b25",
    skin: "boon", action: "Walk the hill",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/406780/ss_d44a111c1ab61335e82687e283253aac84c70d37.1920x1080.jpg?t=1498124174",
  },
  {
    id: "flower-book", num: "03", name: "Flower Book", rule: "flower",
    bg: "#21503b", ink: "#fff4d6", accent: "#ff9fbd",
    image: "https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/c9/bc/fc/c9bcfc3b-4e7a-6721-71ae-41f45b17178b/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/512x512bb.jpg",
  },
  {
    id: "box-jam", num: "04", name: "Box Jam", rule: "boxjam",
    bg: "#1f2a35", ink: "#f7f7f1", accent: "#43a0ff",
    image: "https://play-lh.googleusercontent.com/u_U_XDi6xdzmzshS7tgmbKK0LYLz60oQ-GUPl8Zy3ZI_TX9I8NIhcvlMnCS5RDp7bwlXorgIoEcf4R6qAM3B2rk=s512",
  },
  {
    id: "blob-jam", num: "05", name: "Blob Jam", rule: "blob",
    bg: "#4c2ca0", ink: "#fff9f0", accent: "#ffc94e",
    image: "https://play-lh.googleusercontent.com/MIgFoxNl5IvZ6hP6gDL8AxyzTLQKKOx_lhPmxtE9rvuV-vKCCRN2YLWaGJMdobRjyhJVD8lCCfNJg8gzswvfvg=s512",
  },
  {
    id: "word-bend", num: "06", name: "Word Bend", rule: "word",
    bg: "#f4d6bd", ink: "#201b42", accent: "#e74c68",
    image: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/45/0b/3c/450b3cad-fc96-c12e-cfd1-9b70de15f6aa/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg",
  },
  {
    id: "card-match", num: "07", name: "Card Match Solitaire", rule: "card",
    compact: true,
    bg: "#d4e1c3", ink: "#1f2533", accent: "#246b55",
    image: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/24/eb/06/24eb0604-578f-7515-318b-708e6649b855/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg",
  },
  {
    id: "crazy-sapper", num: "08", name: "Crazy Sapper 3D", rule: "sapper",
    compact: true,
    bg: "#275d34", ink: "#fff8dd", accent: "#ffad25", detail: "#d83425",
    skin: "sapper", action: "Clear the field",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/529420/ss_34038a40ff888e070259ba446b3b1cc5e4bd177a.1920x1080.jpg?t=1782119061",
  },
  {
    id: "astro-lords", num: "09", name: "Astro Lords", rule: "lords",
    bg: "#070a12", ink: "#eef7ff", accent: "#31d8ee", detail: "#e04635",
    skin: "lords", action: "Enter the cloud",
    image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/372190/ss_4ba998829873d05d85240965c91b063e82e0f77c.1920x1080.jpg?t=1782074241",
  },
];

// Cloudflare Web Analytics. Paste the site token from the Cloudflare dashboard
// and both pages pick up the beacon at build time; leave it empty and nothing
// is shipped at all. Nothing is drawn on the page — the beacon only reports.
export const ANALYTICS_TOKEN = "f60cb5f578cf440fb8a07c5541f63b4a";
