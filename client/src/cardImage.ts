/** §2.5: kartalar asl rasmi bilan chiqadi; ilova kartani qayta chizmaydi. Xavfsizlik qoidasi kontent paketida (hamma 418 fayl nomi o'sha yerda tekshiriladi). */
import { cardFileUrl } from "@poyga/content/cardfile";

export const cardImageUrl = cardFileUrl;
export const CARD_IMAGES_BASE: string = (process.env.EXPO_PUBLIC_CARD_IMAGES_URL as string | undefined) ?? "/cards";
