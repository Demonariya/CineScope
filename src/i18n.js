const translations = [
  ["Your movie &amp; series companion.", "همراه شما برای دنیای فیلم و سریال."],
  ["Choose an action below, or send a title directly.", "یکی از گزینه‌های زیر را انتخاب کنید یا نام فیلم و سریال را مستقیم بفرستید."],
  ["Tip: Search supports movie and TV-show titles.", "نکته: جست‌وجو از عنوان فیلم و سریال پشتیبانی می‌کند."],
  ["CineScope help", "راهنمای CineScope"],
  ["Send a title directly to search movies and series.", "برای جست‌وجوی فیلم یا سریال، نام آن را مستقیم ارسال کنید."],
  ["🔎 Search movie / 📺 Search series — find a title", "🔎 جست‌وجوی فیلم / 📺 جست‌وجوی سریال — پیدا کردن عنوان"],
  ["📰 Cinema news — recent news for a title", "📰 اخبار سینما — خبرهای تازه درباره یک عنوان"],
  ["🔥 Trending — current entertainment headlines", "🔥 ترندها — تیترهای داغ سرگرمی"],
  ["📚 Watchlist — saved titles", "📚 فهرست تماشا — عنوان‌های ذخیره‌شده"],
  ["🤖 Ask AI — ask a film or TV question with your API key", "🤖 پرسش از هوش مصنوعی — پرسش درباره فیلم و سریال با کلید API شما"],
  ["🔑 My API keys — add and manage your own provider keys", "🔑 کلیدهای API من — افزودن و مدیریت کلیدهای سرویس‌دهنده"],
  ["🗂 Site metadata — read public metadata from an allowed title page URL", "🗂 اطلاعات سایت — خواندن اطلاعات عمومی صفحه عنوان از سایت‌های مجاز"],
  ["Your AI API keys are encrypted before storage. OMDb uses a separate bot-owner secret. When you submit a key, CineScope attempts to delete that Telegram message immediately. Telegram bots are not end-to-end encrypted, so use a private chat and do not share keys in groups.", "کلیدهای API هوش مصنوعی پیش از ذخیره‌سازی رمزنگاری می‌شوند. OMDb از کلید محرمانه جداگانه مدیر بات استفاده می‌کند. پس از ارسال کلید، CineScope تلاش می‌کند پیام تلگرام را فوراً حذف کند. گفت‌وگوی بات تلگرام رمزنگاری سرتاسری ندارد؛ فقط در گفت‌وگوی خصوصی از این قابلیت استفاده کنید و کلید را در گروه نفرستید."],
  ["Stored keys: ", "کلیدهای ذخیره‌شده: "],
  ["Select a key to activate, test, or remove it.", "برای فعال‌سازی، آزمایش یا حذف، یک کلید را انتخاب کنید."],
  ["No keys added yet. Add a key from the API gateway configured by the bot owner.", "هنوز کلیدی اضافه نشده است. یک کلید از درگاه API تنظیم‌شده توسط مدیر بات اضافه کنید."],
  ["No keys added yet. Add a key from Google AI Studio.", "هنوز کلیدی اضافه نشده است. یک کلید از Google AI Studio اضافه کنید."],
  ["Each key belongs to your own API account and uses its quota. A 429 quota response is reported rather than bypassed by switching keys automatically.", "هر کلید متعلق به حساب API خودتان است و از سهمیه همان حساب استفاده می‌کند. خطای سهمیه ۴۲۹ گزارش می‌شود و بات برای دور زدن محدودیت، کلیدها را خودکار جابه‌جا نمی‌کند."],
  ["You have reached the ", "به سقف "],
  ["-key limit. Remove a key before adding another.", " کلید رسیده‌اید. برای افزودن کلید جدید، ابتدا یکی را حذف کنید."],
  ["Send the key in this private chat as your next message.", "کلید را در پیام بعدی و در همین گفت‌وگوی خصوصی ارسال کنید."],
  ["CineScope will try to delete that message immediately, validate the key, and store it encrypted. The key will never be echoed in chat or written to logs.", "CineScope تلاش می‌کند آن پیام را فوراً حذف کند، کلید را اعتبارسنجی و سپس رمزنگاری‌شده ذخیره کند. کلید در گفت‌وگو بازنشر یا در گزارش‌ها ثبت نمی‌شود."],
  ["Security note:", "نکته امنیتی:"],
  ["Telegram bot chats are not end-to-end encrypted. Only continue in a private chat. Revoke a potentially exposed key in the dashboard of the provider that issued it.", "گفت‌وگوی بات تلگرام رمزنگاری سرتاسری ندارد. فقط در گفت‌وگوی خصوصی ادامه دهید. اگر احتمال می‌دهید کلید افشا شده، آن را از پنل سرویس‌دهنده باطل کنید."],
  ["That does not look like a valid API key. The message was deleted where Telegram permissions allowed. Start again from My API keys.", "این مقدار شبیه کلید API معتبر نیست. پیام در صورت اجازه تلگرام حذف شد. فرایند را از بخش کلیدهای API من دوباره شروع کنید."],
  ["Key limit reached (", "سقف تعداد کلیدها پر شده است ("],
  ["). Remove a saved key first.", "). ابتدا یکی از کلیدهای ذخیره‌شده را حذف کنید."],
  ["That key appears to have already been added.", "به نظر می‌رسد این کلید قبلاً اضافه شده است."],
  ["Checking the key with the configured API gateway…", "در حال بررسی کلید با درگاه API تنظیم‌شده…"],
  ["Checking the key with Google…", "در حال بررسی کلید با Google…"],
  ["The configured provider rejected this key.", "سرویس‌دهنده تنظیم‌شده این کلید را نپذیرفت."],
  ["Gemini rejected this key. Check its permissions or replace it.", "Gemini این کلید را نپذیرفت. مجوزهای آن را بررسی کنید یا کلید دیگری ثبت کنید."],
  ["Google says this API key is invalid or revoked. Check that it was copied completely and is active in the provider dashboard.", "گوگل می‌گوید این کلید API نامعتبر یا باطل شده است. کامل بودن کلید و فعال بودن آن را در پنل سرویس‌دهنده بررسی کنید."],
  ["Google authenticated the request but denied generation access for this project. Check project availability and eligibility in Google AI Studio / Cloud Console.", "گوگل درخواست را شناسایی کرده، اما دسترسی تولید محتوا را برای این پروژه رد کرده است. وضعیت و شرایط دسترسی پروژه را در Google AI Studio یا Cloud Console بررسی کنید."],
  ["This API key is restricted from using the Gemini API. Check the API restrictions attached to the key.", "محدودیت این کلید اجازه استفاده از Gemini API را نمی‌دهد. محدودیت‌های API متصل به کلید را بررسی کنید."],
  ["Google returned a permission error for this generation request. Check Gemini API access and model eligibility for the project.", "گوگل برای درخواست تولید محتوا خطای دسترسی برگردانده است. مجوز Gemini API پروژه و امکان استفاده از مدل را بررسی کنید."],
  ["The provider rate-limited this key. Try again after the quota window resets.", "سرویس‌دهنده برای این کلید محدودیت درخواست اعمال کرده است. پس از بازنشانی سهمیه دوباره تلاش کنید."],
  ["The configured Gemini model is unavailable or does not support generateContent. Check GEMINI_MODEL in Cloudflare Worker settings.", "مدل Gemini تنظیم‌شده در دسترس نیست یا از generateContent پشتیبانی نمی‌کند. مقدار GEMINI_MODEL را در تنظیمات Cloudflare Worker بررسی کنید."],
  ["Gemini accepted the request but returned no text.", "Gemini درخواست را پذیرفت اما متنی برنگرداند."],
  ["Google returned ACCESS_TOKEN_TYPE_UNSUPPORTED for this authorization key. CineScope sends the key with x-goog-api-key. Confirm the key is active in Google AI Studio; if a new AQ key still returns 401, it may be a Google-side key provisioning issue.", "گوگل خطای ACCESS_TOKEN_TYPE_UNSUPPORTED را برای این کلید احراز هویت برگردانده است. CineScope کلید را با سربرگ x-goog-api-key می‌فرستد. فعال بودن کلید را در Google AI Studio بررسی کنید؛ اگر کلید تازه AQ نیز خطای ۴۰۱ داد، ممکن است مشکل از صدور کلید در سمت گوگل باشد."],
  ["Google response: ", "پاسخ Google: "],
  ["The provider rate-limited the key during validation. Try later.", "سرویس‌دهنده هنگام بررسی، محدودیت درخواست برای این کلید اعمال کرد. بعداً دوباره تلاش کنید."],
  ["The bot owner has not configured AI_API_BASE_URL.", "مدیر بات مقدار AI_API_BASE_URL را تنظیم نکرده است."],
  ["The key could not be validated. Check it and try again.", "اعتبار کلید تأیید نشد. آن را بررسی و دوباره تلاش کنید."],
  [" It has not been stored.", " این کلید ذخیره نشد."],
  ["✅ API key validated and saved in encrypted storage.", "✅ کلید API تأیید و به‌صورت رمزنگاری‌شده ذخیره شد."],
  ["Status: ", "وضعیت: "], ["Active: ", "فعال: "], ["Added: ", "زمان افزودن: "],
  ["Rate limited", "محدودشده از نظر تعداد درخواست"], ["Invalid / rejected", "نامعتبر / ردشده"],
  ["Ready", "آماده"], ["Active: Yes", "فعال: بله"], ["Active: No", "فعال: خیر"], ["Key not found.", "کلید پیدا نشد."],
  ["Key test results", "نتیجه آزمایش کلیدها"],
  ["OMDb is not configured by the bot owner. I can provide an approximate AI-only lookup instead.", "مدیر بات OMDb را تنظیم نکرده است. در عوض می‌توان جست‌وجوی تقریبی مبتنی بر هوش مصنوعی انجام داد."],
  ["Searching OMDb for ", "در حال جست‌وجو در OMDb برای "], ["OMDb results for ", "نتایج OMDb برای "],
  ["OMDb search failed: ", "جست‌وجوی OMDb ناموفق بود: "],
  ["No matching titles were found in OMDb. Try the original title or include the release year.", "عنوانی مطابق جست‌وجو در OMDb پیدا نشد. عنوان اصلی را امتحان کنید یا سال انتشار را هم بنویسید."],
  ["OMDb metadata is not configured by the bot owner. Add an AI API key for a cautious AI-only lookup, or ask the bot owner to configure OMDb.", "اطلاعات OMDb توسط مدیر بات تنظیم نشده است. برای جست‌وجوی تقریبی یک کلید هوش مصنوعی اضافه کنید یا از مدیر بخواهید OMDb را پیکربندی کند."],
  ["AI lookup · ", "جست‌وجوی هوش مصنوعی · "], ["AI-generated; verify details against an authoritative catalog.", "تولیدشده با هوش مصنوعی؛ اطلاعات را با یک پایگاه داده معتبر تطبیق دهید."],
  ["AI request failed: ", "درخواست هوش مصنوعی ناموفق بود: "], ["You can manage your keys from My API keys.", "می‌توانید کلیدها را از بخش «کلیدهای API من» مدیریت کنید."],
  ["Save to watchlist", "افزودن به فهرست تماشا"], ["Similar titles", "عنوان‌های مشابه"],
  ["Check source metadata", "بررسی اطلاعات منبع"], ["Main menu", "منوی اصلی"], ["Back to title", "بازگشت به عنوان"],
  ["Searching recent news for ", "در حال جست‌وجوی خبرهای تازه درباره "],
  ["The news feed is temporarily unavailable. Try again later.", "سرویس خبر موقتاً در دسترس نیست. بعداً دوباره تلاش کنید."],
  ["News feed request failed", "درخواست خوراک خبری ناموفق بود"],
  ["No recent articles were found for that title.", "خبر تازه‌ای درباره این عنوان پیدا نشد."],
  ["Add your AI API key to generate similar-title recommendations. All returned suggestions will be checked against OMDb before they are shown.", "برای پیشنهاد عنوان‌های مشابه، کلید API هوش مصنوعی خود را اضافه کنید. همه پیشنهادها پیش از نمایش با OMDb بررسی می‌شوند."],
  ["Finding similar titles and verifying them in OMDb…", "در حال پیدا کردن عنوان‌های مشابه و بررسی آن‌ها در OMDb…"],
  ["No similar titles could be verified in OMDb. Try again with another title.", "هیچ عنوان مشابهی در OMDb تأیید نشد. عنوان دیگری را امتحان کنید."],
  ["AI suggestions verified by OMDb", "پیشنهادهای هوش مصنوعی، تأییدشده با OMDb"],
  ["Send a public detail-page URL from dornatv.com, movieplus.top, or animex.pro. CineScope reads only visible page metadata (title, synopsis, year, genre, cast and rating); it does not extract player, download, or video URLs.", "نشانی عمومی صفحه جزئیات را از dornatv.com، movieplus.top یا animex.pro ارسال کنید. CineScope فقط اطلاعات قابل‌مشاهده صفحه (عنوان، خلاصه، سال، ژانر، بازیگران و امتیاز) را می‌خواند و نشانی پلیر، دانلود یا ویدئو را استخراج نمی‌کند."],
  ["Could not read source metadata: ", "خواندن اطلاعات منبع ممکن نشد: "], ["Check another source page", "بررسی صفحه منبع دیگر"],
  ["This title is already in your watchlist.", "این عنوان از قبل در فهرست تماشای شماست."],
  ["Your watchlist is full (", "فهرست تماشای شما پر شده است ("], [" items). Remove an item first.", " مورد). ابتدا یک مورد را حذف کنید."],
  [" added to your watchlist.", " به فهرست تماشای شما اضافه شد."],
  ["Your watchlist is empty. Search for a title and tap Save to watchlist.", "فهرست تماشای شما خالی است. یک عنوان جست‌وجو کنید و «افزودن به فهرست تماشا» را بزنید."],
  ["Your watchlist", "فهرست تماشای شما"], ["Watchlist cleared.", "فهرست تماشا پاک شد."],
  ["Please use CineScope in a private chat. API-key management is disabled in groups.", "لطفاً از CineScope در گفت‌وگوی خصوصی استفاده کنید. مدیریت کلید API در گروه‌ها غیرفعال است."],
  ["Send the movie title.", "نام فیلم را ارسال کنید."], ["Send the series title.", "نام سریال را ارسال کنید."],
  ["Send the movie or series title for recent news.", "نام فیلم یا سریال را برای دریافت خبرهای تازه ارسال کنید."],
  ["Send your movie or TV question.", "پرسش خود درباره فیلم یا سریال را ارسال کنید."],
  ["Add an AI API key before using AI chat.", "پیش از استفاده از گفت‌وگوی هوش مصنوعی، یک کلید API اضافه کنید."],
  ["Trending news is unavailable: ", "خبرهای داغ فعلاً در دسترس نیستند: "],
  ["No trending entertainment headlines are available right now.", "در حال حاضر تیتر داغی از حوزه سرگرمی در دسترس نیست."],
  ["Trending entertainment headlines", "تیترهای داغ حوزه سرگرمی"], ["Open an article to read the publisher's report.", "برای خواندن گزارش ناشر، مقاله را باز کنید."],
  ["Use the bot in a private chat.", "از بات در گفت‌وگوی خصوصی استفاده کنید."],
  ["Search for a title first.", "ابتدا یک عنوان جست‌وجو کنید."],
  ["That action is not supported. Use the menu buttons.", "این عملیات پشتیبانی نمی‌شود. از دکمه‌های منو استفاده کنید."],
  ["Could not complete that action: ", "انجام این عملیات ممکن نشد: "],
  ["Original title:", "عنوان اصلی:"], ["Type: Movie", "نوع: فیلم"], ["Type: TV series", "نوع: سریال"], ["Type:", "نوع:"],
  ["IMDb ID:", "شناسه IMDb:"], ["Year:", "سال:"], ["Runtime:", "مدت زمان:"], ["Seasons:", "فصل‌ها:"],
  ["Genre:", "ژانر:"], ["Director: ", "کارگردان: "], ["Creator / writer: ", "سازنده / نویسنده: "],
  ["Rating:", "امتیاز:"], ["Not rated", "بدون امتیاز"], ["Rated:", "رده‌بندی سنی:"],
  ["Released:", "تاریخ انتشار:"], ["Country:", "کشور:"], ["Language:", "زبان:"], ["Cast:", "بازیگران:"],
  ["Awards:", "جوایز:"], ["Metascore:", "امتیاز متاسکور:"], ["Box office:", "فروش گیشه:"],
  ["Plot", "خلاصه داستان"], ["Season guide", "راهنمای فصل‌ها"],
  ["Use a season button below to list all available episodes", "برای مشاهده قسمت‌های موجود، دکمه فصل موردنظر را در پایین انتخاب کنید"],
  [" seasons).", " فصل)."], ["(OMDb reports ", "(OMDb تعداد "], ["Year: Unknown", "سال: نامشخص"], ["Runtime: Unknown", "مدت زمان: نامشخص"],
  ["Seasons: Unknown", "فصل‌ها: نامشخص"], ["Genre: Unknown", "ژانر: نامشخص"],
  ["کارگردان: Unknown", "کارگردان: نامشخص"], ["سازنده / نویسنده: Unknown", "سازنده / نویسنده: نامشخص"],
  ["Rated: Unknown", "رده‌بندی سنی: نامشخص"], ["Released: Unknown", "تاریخ انتشار: نامشخص"],
  ["Country: Unknown", "کشور: نامشخص"], ["Language: Unknown", "زبان: نامشخص"],
  ["Cast: Not available", "بازیگران: در دسترس نیست"], ["Added: Unknown", "زمان افزودن: نامشخص"],
  ["No synopsis is available.", "خلاصه داستانی در دسترس نیست."],
  ["Year unknown", "سال نامشخص"], ["Episodes:", "قسمت‌ها:"], ["Date unknown", "تاریخ نامشخص"],

  ["Source-page metadata", "اطلاعات صفحه منبع"], ["Site title:", "عنوان سایت:"], ["Date:", "تاریخ:"],
  ["Genres:", "ژانرها:"], ["Description", "توضیحات"], ["No structured synopsis was found on this page.", "خلاصه داستان ساختاریافته‌ای در این صفحه پیدا نشد."],
  ["Requested title:", "عنوان درخواستی:"], ["Not exposed by page", "در صفحه ارائه نشده است"],
  ["Open the source page", "باز کردن صفحه منبع"], ["Date unavailable", "تاریخ در دسترس نیست"],
  ["News source", "منبع خبر"], ["Read article", "خواندن مقاله"],
  ["Limited", "محدود"], ["Invalid", "نامعتبر"], ["ACTIVE", "فعال"], ["valid", "معتبر"], ["IMDb page", "صفحه IMDb"],
  ["Manage keys", "مدیریت کلیدها"], ["Add API key", "افزودن کلید API"],
  ["Add AI API key", "افزودن کلید API هوش مصنوعی"], ["Test all keys", "آزمایش همه کلیدها"],
  ["Refresh key list", "تازه‌سازی فهرست کلیدها"], ["Try again", "تلاش دوباره"], ["My keys", "کلیدهای من"],
  ["Set as active", "فعال‌سازی این کلید"], ["Test this key", "آزمایش این کلید"], ["Remove key", "حذف کلید"],
  ["Back to keys", "بازگشت به کلیدها"], ["Open watchlist", "باز کردن فهرست تماشا"],
  ["Clear watchlist", "پاک کردن فهرست تماشا"], ["Open article", "باز کردن مقاله"],
  ["Search movie", "جست‌وجوی فیلم"], ["Search series", "جست‌وجوی سریال"],
  ["Cinema news", "اخبار سینما"], ["Trending", "ترندها"], ["Watchlist", "فهرست تماشا"],
  ["Ask AI", "پرسش از هوش مصنوعی"], ["My API keys", "کلیدهای API من"],
  ["Site metadata", "اطلاعات سایت"], ["Help", "راهنما"], ["Cancel", "لغو"],
  ["Send a movie or series title…", "نام فیلم یا سریال را ارسال کنید…"],
  ["Select language / زبان را انتخاب کنید:", "زبان موردنظر را انتخاب کنید:"],
  ["Language updated to Persian.", "زبان بات به فارسی تغییر کرد."],
  ["Bot language changed to English.", "زبان بات به انگلیسی تغییر کرد."],
  ["Please use CineScope in a private chat. API-key management is disabled in groups.", "لطفاً از CineScope در گفت‌وگوی خصوصی استفاده کنید. مدیریت کلید API در گروه‌ها غیرفعال است."],
  ["CineScope hit an internal error while handling that request. Please try again.", "هنگام پردازش درخواست خطای داخلی رخ داد. لطفاً دوباره تلاش کنید."],
  ["The provider validation failed", "اعتبارسنجی سرویس‌دهنده ناموفق بود"],
  ["The provider rejected this key.", "سرویس‌دهنده این کلید را نپذیرفت."],
  ["The provider rate-limited this key.", "سرویس‌دهنده برای این کلید محدودیت درخواست اعمال کرده است."],
  ["OMDb request limit reached. Try again later.", "سقف درخواست OMDb پر شده است. بعداً دوباره تلاش کنید."],
  ["OMDb rejected OMDB_API_KEY. Check the key in Cloudflare Worker secrets.", "OMDb کلید OMDB_API_KEY را نپذیرفت. مقدار آن را در اسرار Cloudflare Worker بررسی کنید."],
  ["Only HTTPS detail pages from dornatv.com, movieplus.top, or animex.pro are supported.", "فقط نشانی صفحه جزئیات با HTTPS از سایت‌های dornatv.com، movieplus.top و animex.pro پشتیبانی می‌شود."],
  ["URLs containing credentials are not allowed.", "نشانی‌های اینترنتی دارای نام کاربری یا گذرواژه پذیرفته نمی‌شوند."],
  ["The source page redirected too many times.", "تعداد تغییر مسیرهای صفحه منبع بیش از حد مجاز است."],
  ["The source page could not be loaded safely.", "بارگذاری امن صفحه منبع ممکن نشد."],
  ["Send a valid HTTPS page URL from one of the supported sites.", "یک نشانی معتبر HTTPS از صفحه یکی از سایت‌های پشتیبانی‌شده ارسال کنید."],
  ["The source page is larger than the 2 MB metadata limit.", "حجم صفحه منبع از محدودیت ۲ مگابایتی اطلاعات بیشتر است."],
  ["The supplied URL did not return an HTML page.", "نشانی ارسال‌شده یک صفحه HTML برنگرداند."],
  [" · Movie", " · فیلم"],
  [" · Series", " · سریال"],
  ["Not exposed by page", "در صفحه ارائه نشده است"],
  ["No structured synopsis was found on this page.", "خلاصه داستان ساختاریافته‌ای در این صفحه پیدا نشد."],
  ["Buttons", "امکانات"],
  ["Privacy", "حریم خصوصی و امنیت"],
  ["AI gateway", "درگاه هوش مصنوعی"],
  ["Testing saved keys with the configured API gateway…", "در حال آزمایش کلیدهای ذخیره‌شده با درگاه API…"],
  ["Testing saved keys with Google…", "در حال آزمایش کلیدهای ذخیره‌شده با Google…"],
  ["➕ Add AI API key", "➕ افزودن کلید API هوش مصنوعی"],
  ["🧪 Test all keys", "🧪 آزمایش همه کلیدها"],
  ["🔄 Refresh key list", "🔄 تازه‌سازی فهرست کلیدها"],
  ["⬅️ Main menu", "⬅️ منوی اصلی"],
  ["🧪 Test this key", "🧪 آزمایش این کلید"],
  ["🗑 Remove key", "🗑 حذف کلید"],
  ["✅ Set as active", "✅ فعال‌سازی این کلید"],
  ["Manage API keys", "مدیریت کلیدهای API"],
  ["Main menu", "منوی اصلی"],
  ["📰 News", "📰 اخبار"],
  ["✨ Similar titles", "✨ عنوان‌های مشابه"],
  ["Open watchlist", "باز کردن فهرست تماشا"],
  ["Check another source page", "بررسی صفحه منبع دیگر"],
  ["Untitled", "بدون عنوان"],
  ["Date unknown", "تاریخ نامشخص"],
  ["⬅️ Back to title", "⬅️ بازگشت به جزئیات"],
  ["⬅️ Back to keys", "⬅️ بازگشت به کلیدها"],
  ["Open article", "باز کردن مقاله"],
  ["AI did not return a valid JSON recommendation list.", "هوش مصنوعی فهرست پیشنهادها را در قالب JSON معتبر برنگرداند."],
  ["That action is not supported. Use the menu buttons.", "این عملیات پشتیبانی نمی‌شود. از دکمه‌های منو استفاده کنید."],
  ["Search for a title first.", "ابتدا یک عنوان جست‌وجو کنید."],
  ["Watchlist cleared.", "فهرست تماشا پاک شد."],
  ["Key not found.", "کلید پیدا نشد."]
];

const sortedTranslations = translations
  .filter((entry) => Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string")
  .sort((a, b) => b[0].length - a[0].length);

export function languageFromTelegram(_languageCode = "") {
  // CineScope is Persian-only: Telegram client locale never changes the bot language.
  return "fa";
}

export function normalizeInput(value = "") {
  const text = String(value).trim();
  const aliases = new Map([
    ["🔎 جست‌وجوی فیلم", "🔎 Search movie"],
    ["📺 جست‌وجوی سریال", "📺 Search series"],
    ["📰 اخبار سینما", "📰 Cinema news"],
    ["🔥 ترندها", "🔥 Trending"],
    ["📚 فهرست تماشا", "📚 Watchlist"],
    ["🤖 پرسش از هوش مصنوعی", "🤖 Ask AI"],
    ["🔑 کلیدهای API من", "🔑 My API keys"],
    ["🗂 اطلاعات سایت", "🗂 Site metadata"],
    ["🔗 دریافت لینک از سایت‌ها", "🔗 Search site links"],
    ["🌐 Language / زبان", "/language"],
    ["🌐 زبان", "/language"],
    ["🌐 زبان / زبان", "/language"],
    ["❔ راهنما", "❔ Help"],
    ["✖️ لغو", "✖️ Cancel"]
  ]);
  return aliases.get(text) || text;
}

export function translateText(value = "", language = "en") {
  let output = String(value);
  if (language !== "fa") return output;
  output = output.replace(/Showing (\d+) of (\d+) episodes\./g, "نمایش $1 از $2 قسمت.");
  for (const [english, persian] of sortedTranslations) output = output.replaceAll(english, persian);
  return output;
}

export function localizeMarkup(markup, language = "en") {
  if (!markup || language !== "fa") return markup;
  const translateButton = (button) => {
    let text = button.text;
    if (text === "🌐 Language / زبان") text = "🌐 زبان";
    else if (text === "🇬🇧 English") text = "🇬🇧 انگلیسی";
    else if (typeof text === "string" && /^Season \d+$/.test(text)) text = text.replace(/^Season /, "فصل ");
    else if (typeof text === "string") text = translateText(text, language);
    return { ...button, ...(typeof text === "string" ? { text } : {}) };
  };
  const result = { ...markup };
  if (Array.isArray(markup.keyboard)) result.keyboard = markup.keyboard.map((row) => row.map(translateButton));
  if (Array.isArray(markup.inline_keyboard)) result.inline_keyboard = markup.inline_keyboard.map((row) => row.map(translateButton));
  if (typeof markup.input_field_placeholder === "string") {
    result.input_field_placeholder = translateText(markup.input_field_placeholder, language);
  }
  return result;
}
