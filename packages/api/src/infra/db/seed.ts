import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, "../../../.env");
const envRoot = resolve(__dirname, "../../../../../.env");
config({ path: existsSync(envLocal) ? envLocal : envRoot });

import { DEFAULT_CATEGORIES } from "@flowers-tg/shared";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories, products } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Exiting.");
  process.exit(1);
}

const client = postgres(databaseUrl);
const db = drizzle(client);

/** Каталог «Цветы Любимого Города», Каменск-Уральский — демо-данные для витрины */
const SEED_PRODUCTS = [
  // Букеты (7)
  {
    id: "p1",
    title: "Нежность Каменска",
    description:
      "Воздушный букет из кустовых хризантем и альстромерий в пастельных тонах. Собираем в день заказа в нашей мастерской на Урале.",
    price: 2300,
    originalPrice: 2690,
    images: ["https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Хризантемы кустовые 5 веток, альстромерия 7 шт, зелень, крафт",
    stock: 14,
    sortOrder: 1,
  },
  {
    id: "p2",
    title: "Уральское утро",
    description:
      "Тюльпаны и белые фрезии — классика, которая подойдёт и к 8 Марта, и к дню рождения. Лёгкий аромат и аккуратная упаковка.",
    price: 2100,
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Тюльпаны микс 11 шт, фрезии белые 5 шт, рускус",
    stock: 22,
    sortOrder: 2,
  },
  {
    id: "p3",
    title: "Летний бриз",
    description:
      "Собранный из полевых мотивов букет в стиле прованс. Отличный вариант без повода — просто порадовать близкого человека.",
    price: 1800,
    images: ["https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Ромашки, диантусы, лимониум, колоски, крафт-лента",
    stock: 20,
    sortOrder: 3,
  },
  {
    id: "p4",
    title: "Романтика города",
    description:
      "Нежные пионы и кустовые розы в розовой гамме. Для признаний и годовщин — букет, от которого сложно отвести взгляд.",
    price: 4600,
    originalPrice: 5200,
    images: ["https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Пионы 5 шт, розы кустовые 7 шт, гипсофила, атласная лента",
    stock: 9,
    sortOrder: 4,
  },
  {
    id: "p5",
    title: "Облако гортензии",
    description:
      "Объёмный букет с сине-белой гортензией и эустомой. Держится свежим долго и смотрится эффектно в интерьере.",
    price: 3900,
    images: ["https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Гортензия 2 шт, эустома 6 шт, эвкалипт, упаковка премиум",
    stock: 11,
    sortOrder: 5,
  },
  {
    id: "p6",
    title: "Морозное серебро",
    description:
      "Белоснежные хризантемы и розы в холодной палитре. Строгость и изысканность — для делового подарка или юбилея.",
    price: 2700,
    images: ["https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Хризантемы одноголовые белые 7 шт, розы белые 5 шт, писташ",
    stock: 16,
    sortOrder: 6,
  },
  {
    id: "p7",
    title: "Ярмарка сезона",
    description:
      "Яркий микс из того, что сейчас лучше всего на опте: розы, альстромерия, хризантемы. Универсальный подарок на любой бюджет среднего сегмента.",
    price: 2950,
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"],
    categoryId: "bouquets",
    composition: "Розы 5 шт, альстромерия 5 шт, хризантема кустовая 1 ветка, зелень",
    stock: 18,
    sortOrder: 7,
  },
  // Розы (6)
  {
    id: "p8",
    title: "Алые розы «Классика»",
    description:
      "Двадцать пять красных роз длины 60 см — эталонный жест. Дополним зеленью и фирменной лентой «Цветы Любимого Города».",
    price: 4500,
    images: ["https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы красные Эквадор 25 шт, зелень, атласная лента",
    stock: 15,
    sortOrder: 8,
  },
  {
    id: "p9",
    title: "Белое облако",
    description:
      "Пятнадцать белых роз с гипсофилой — символ чистоты намерений. Подойдёт для свадьбы, крестин или извинения.",
    price: 3500,
    originalPrice: 4100,
    images: ["https://images.unsplash.com/photo-1495231916356-a86217efff12?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы белые 15 шт, гипсофила, упаковка премиум",
    stock: 12,
    sortOrder: 9,
  },
  {
    id: "p10",
    title: "Розовый закат",
    description:
      "Градиент от нежно-розового к бордо — двадцать одна роза. Эффектный букет для тех, кто любит небанальные подарки.",
    price: 4200,
    originalPrice: 4900,
    images: ["https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы розовые и бордовые 21 шт, зелень, лента",
    stock: 10,
    sortOrder: 10,
  },
  {
    id: "p11",
    title: "Черри Бренди",
    description:
      "Пятнадцать роз необычного кораллово-терракотового оттенка. Современная альтернатива классическому красному.",
    price: 3900,
    images: ["https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы Черри Бренди 15 шт, эвкалипт николи",
    stock: 8,
    sortOrder: 11,
  },
  {
    id: "p12",
    title: "Пятьдесят одна для тебя",
    description:
      "Пышный монобукет из роз выборочной длины. Максимум эмоций для особой даты — доставка по Каменску-Уральскому в удобный слот.",
    price: 8200,
    originalPrice: 9200,
    images: ["https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы красные или розовые на выбор 51 шт, зелень, упаковка люкс",
    stock: 5,
    sortOrder: 12,
  },
  {
    id: "p13",
    title: "Семь роз «Признание»",
    description:
      "Компактный букет из семи роз — скромно, но со смыслом. Удобно вручить лично или дополнить к основному подарку.",
    price: 2200,
    images: ["https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&h=600&fit=crop"],
    categoryId: "roses",
    composition: "Розы 7 шт на выбор цвета, гипсофила, крафт",
    stock: 25,
    sortOrder: 13,
  },
  // Композиции (6)
  {
    id: "p14",
    title: "Солнечный день",
    description:
      "Подсолнухи и жёлтые хризантемы — заряд хорошего настроения. Композиция в глубокой вазе-упаковке сохраняет форму при перевозке.",
    price: 3200,
    images: ["https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Подсолнухи 4 шт, хризантемы кустовые 4 ветки, зелень, декор",
    stock: 7,
    sortOrder: 14,
  },
  {
    id: "p15",
    title: "Весенний сад в коробке",
    description:
      "Шляпная коробка с розами, гортензией и эустомой — универсальный подарок-коробка без поиска вазы дома.",
    price: 5100,
    originalPrice: 5700,
    images: ["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Розы 9 шт, гортензия 1 шт, эустома 5 шт, шляпная коробка",
    stock: 6,
    sortOrder: 15,
  },
  {
    id: "p16",
    title: "Сердце в цветах",
    description:
      "Объёмная флористическая композиция в форме сердца из роз и гипсофилы. Для Дня святого Валентина и годовщин.",
    price: 5800,
    images: ["https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Розы красные 35–40 шт, гипсофила, оазис, атлас",
    stock: 4,
    sortOrder: 16,
  },
  {
    id: "p17",
    title: "Тропический акцент",
    description:
      "Протея, антуриум и зелень — для тех, кто устал от классических роз. Экзотика в сдержанной подаче.",
    price: 4800,
    images: ["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Протея 2 шт, антуриум 3 шт, монстера, стеклянная ваза",
    stock: 5,
    sortOrder: 17,
  },
  {
    id: "p18",
    title: "Монохром элегантность",
    description:
      "Белые каллы и кремовые розы в длинной коробке. Строгий подарок для коллеги или руководителя.",
    price: 5400,
    images: ["https://images.unsplash.com/photo-1495231916356-a86217efff12?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Каллы белые 9 шт, розы кремовые 7 шт, подарочная коробка",
    stock: 5,
    sortOrder: 18,
  },
  {
    id: "p19",
    title: "Лиловый туман",
    description:
      "Лиловая гортензия, статица и эустома в пастельной гамме. Мягкий переход оттенков для уютного поздравления.",
    price: 4100,
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop"],
    categoryId: "compositions",
    composition: "Гортензия лиловая 1 шт, эустома 6 шт, статица, керамическая ваза",
    stock: 8,
    sortOrder: 19,
  },
  // Свадебные (3)
  {
    id: "p20",
    title: "Свадебный каскад",
    description:
      "Каскадный букет с пионовидными розами и эвкалиптом. Индивидуальный подбор оттенка под платье — запись на примерку в салоне.",
    price: 6900,
    images: ["https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&h=600&fit=crop"],
    categoryId: "wedding",
    composition: "Розы пионовидные белые 18 шт, эвкалипт, жемчужная лента",
    stock: 4,
    sortOrder: 20,
  },
  {
    id: "p21",
    title: "Круглый букет невесты",
    description:
      "Классический круглый букет из кустовых роз и фрезии. Лёгкий вес и удобная ручка для долгой фотосессии.",
    price: 5900,
    originalPrice: 6500,
    images: ["https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&h=600&fit=crop"],
    categoryId: "wedding",
    composition: "Розы кустовые белые и кремовые 25–30 шт, фрезия 7 шт",
    stock: 6,
    sortOrder: 21,
  },
  {
    id: "p22",
    title: "Набор «Жених и невеста»",
    description:
      "Свадебный букет среднего размера плюс бутоньерка в тон. Экономия времени: всё согласовано по палитре одним флористом.",
    price: 7800,
    images: ["https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=600&fit=crop"],
    categoryId: "wedding",
    composition: "Букет невесты (розы, эустома), бутоньерка, атласные ленты",
    stock: 3,
    sortOrder: 22,
  },
  // Корзины (3)
  {
    id: "p23",
    title: "Корзина изобилия",
    description:
      "Плетёная корзина с розами, лилиями и хризантемами — солидный подарок начальнику или родителям на юбилей.",
    price: 5800,
    images: ["https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=600&fit=crop"],
    categoryId: "baskets",
    composition: "Розы 11 шт, лилии 5 шт, хризантемы 7 шт, зелень, корзина",
    stock: 5,
    sortOrder: 23,
  },
  {
    id: "p24",
    title: "Прованс в корзине",
    description:
      "Лёгкое сочетание полевых мотивов и кустовых хризантем в плетёной корзине с ручкой. Уютный сельский шик.",
    price: 4400,
    images: ["https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=600&fit=crop"],
    categoryId: "baskets",
    composition: "Ромашковый хризантемный микс, диантусы, зелень, корзина прованс",
    stock: 7,
    sortOrder: 24,
  },
  {
    id: "p25",
    title: "Корзина «Белая лилия»",
    description:
      "Белоснежные лилии и розы в малой корзине — выражение уважения без излишней пышности. Аромоматный и нарядный вариант.",
    price: 5200,
    originalPrice: 5800,
    images: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=600&fit=crop"],
    categoryId: "baskets",
    composition: "Лилии белые 5 шт, розы белые 7 шт, аспидистра, корзинка",
    stock: 6,
    sortOrder: 25,
  },
  // Комнатные (3)
  {
    id: "p26",
    title: "Орхидея Фаленопсис",
    description:
      "Две ветки белой фаленопсиса в керамическом кашпо. Долгоиграющий подарок для дома или офиса в Каменске-Уральском.",
    price: 3200,
    originalPrice: 3600,
    images: ["https://images.unsplash.com/photo-1567748157439-651aca2ff064?w=600&h=600&fit=crop"],
    categoryId: "indoor",
    composition: "Фаленопсис 2 стебля, керамическое кашпо, декоративный мох",
    stock: 9,
    sortOrder: 26,
  },
  {
    id: "p27",
    title: "Сансевиерия в керамике",
    description:
      "Неприхотливое растение для тех, кто редко бывает дома. Очищает воздух и выглядит стильно в скандинавском интерьере.",
    price: 2100,
    images: ["https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=600&fit=crop"],
    categoryId: "indoor",
    composition: "Сансевиерия лауренти, керамический горшок Ø18 см",
    stock: 14,
    sortOrder: 27,
  },
  {
    id: "p28",
    title: "Спатифиллум «Женское счастье»",
    description:
      "Белые «флаги» цветков и глянцевые листья. Традиционный подарок на новоселье или в знак поддержки.",
    price: 2600,
    images: ["https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&h=600&fit=crop"],
    categoryId: "indoor",
    composition: "Спатифиллум средний, декоративный горшок, подставка",
    stock: 11,
    sortOrder: 28,
  },
  // Подарки (4)
  {
    id: "p29",
    title: "Набор «Сладкий букет»",
    description:
      "Компактный букет сезонных цветов, бельгийские конфеты и открытка с пожеланием. Готовая композиция «под ключ».",
    price: 2400,
    images: ["https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&h=600&fit=crop"],
    categoryId: "gifts",
    composition: "Мини-букет, конфеты 250 г, открытка, подарочный пакет",
    stock: 17,
    sortOrder: 29,
  },
  {
    id: "p30",
    title: "«Чай и нежность»",
    description:
      "Нежные цветы в коробке рядом с банкой премиального чая и мёда в мини-баночке. Удобно забрать самовывозом из точки на Ленина.",
    price: 2800,
    originalPrice: 3200,
    images: ["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=600&fit=crop"],
    categoryId: "gifts",
    composition: "Цветы в коробке, чай 50 г, мёд 120 г, шпагат декор",
    stock: 12,
    sortOrder: 30,
  },
  {
    id: "p31",
    title: "Букет с мишкой",
    description:
      "Небольшой букет из хризантем и роз плюс плюшевый мишка 20 см. Популярный выбор на выписку и день рождения девочке.",
    price: 3100,
    images: ["https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&h=600&fit=crop"],
    categoryId: "gifts",
    composition: "Розы 5 шт, хризантема кустовая 1 ветка, мишка, прозрачная упаковка",
    stock: 15,
    sortOrder: 31,
  },
  {
    id: "p32",
    title: "Корзина фрукт и цветок",
    description:
      "Съедобная корзина с яблоками, грушами и виноградом, украшенная живыми цветами. Для визита к родственникам в больницу или домой.",
    price: 3400,
    images: ["https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=600&fit=crop"],
    categoryId: "gifts",
    composition: "Фрукты сезонные 2–2,5 кг, декор цветами, плетёная корзина",
    stock: 8,
    sortOrder: 32,
  },
];

async function seed() {
  console.log("Seeding database...");

  await db.insert(categories).values(DEFAULT_CATEGORIES).onConflictDoNothing();

  await db
    .insert(products)
    .values(
      SEED_PRODUCTS.map((p) => ({
        ...p,
        active: true,
      })),
    )
    .onConflictDoNothing();

  console.log(
    `Seeded ${DEFAULT_CATEGORIES.length} categories and ${SEED_PRODUCTS.length} products`,
  );
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
