"use strict";
const AGENT_VER = 1;
const AGENT_PORT = 47615;
const AG_ROOM_TYPES = ["Спальня", "Гардеробная", "Гостиная", "Столовая", "Кухня", "Санузел", "Котельная", "Кладовая", "Прихожая", "Коридор", "Другое"];
const AG_ENUMS = {
  doorKind: ["door", "entry", "open", "arch"],
  doorOp: ["swing", "double", "slide", "slide2", "pocket", "fold"],
  leaf: ["panel", "flat", "glass", "half", "full"],
  winOp: ["tiltturn", "turn", "tilt", "slide", "lift", "fixed"],
  roof: ["gable", "hip", "halfhip", "pyramid", "gambrel", "shed", "flat"],
  fence: ["mesh", "panel3d", "profile", "picket", "euro", "ranch", "boards", "brick", "forged"],
  gate: ["swing", "slide", "none"],
  weather: ["clear", "few", "cloudy", "overcast", "rain", "storm", "snow", "hail", "fog"],
  light: ["day", "gold", "dusk", "night", "bright"],
  lamps: ["auto", "on", "off"],
  quality: ["fast", "nice", "max"],
  cam: ["iso", "street", "back", "left", "right", "top", "iso2", "plot"],
  kitMod: ["base", "drawers", "sink", "hob", "dw", "fridge", "oven", "tall"],
  opKind: ["gate", "door", "win"],
  opOp: ["sectional", "swing2", "slide", "roller", "swing", "turn", "fixed"]
};
const AG_N = d => ({type: "number", description: d});
const AG_S = d => ({type: "string", description: d});
const AG_B = d => ({type: "boolean", description: d});
const AG_E = (list, d) => ({type: "string", enum: list, description: d});
const AG_P3 = d => ({type: "array", items: {type: "number"}, minItems: 2, maxItems: 3, description: d});
const AG_OBJ = (props, req, d) => Object.assign({type: "object", properties: props}, req ? {required: req} : {}, d ? {description: d} : {});

const AGENT_HELP = [
  "Конструктор одноэтажного дома и участка, открыт во вкладке браузера у пользователя. Каждый вызов, который меняет план, это один шаг истории, Ctrl+Z у пользователя его отменяет. Пользователь видит все правки сразу.",
  "Единица везде метр. Есть две системы координат, в обеих ось y идёт вниз по плану.",
  "Участок. Начало в левом верхнем углу участка, улица и красная линия внизу, на y = plot.d. В этих координатах стоят объекты участка (objects: баня, деревья, машины, заборы) и центр дома house.cx, house.cy.",
  "Дом. Начало в левом верхнем углу внутреннего контура комнат. В этих координатах комнаты, двери, окна и мебель (items). При house.rot = 0 сторона дома с наибольшим y смотрит на улицу. Контур дома сам сдвигается так, чтобы начинаться в 0, 0.",
  "Комнаты это прямоугольники x, y, w, d. Стены не хранятся. Они сами встают между двумя разными комнатами и по наружному контуру. Чтобы у двух комнат была общая стена, ставь их вплотную, например вторая начинается в x = x1 + w1 первой. Наружные стены толщиной house.wall стоят снаружи контура, перегородки толщиной house.inner делятся пополам между комнатами.",
  "Двери и окна стоят на линии стены. x, y это центр проёма, o равно h для стены вдоль x и v для стены вдоль y. Окна бывают только на наружных стенах. Проще всего ставить их через add_opening с id комнаты, тогда место на свободной стене найдётся само.",
  "У мебели и объектов x, y это левый верхний угол модели без поворота, центр в x + w/2, y + d/2. rot это поворот в градусах по часовой стрелке. При rot = 0 модель смотрит лицом вниз по плану (к +y), спинка дивана, изголовье кровати и задняя стенка шкафа сверху. Спиной к верхней стене rot 0, к правой 90, к нижней 180, к левой 270.",
  "Порядок работы: get_plan, потом правки, потом get_plan ещё раз и проверка warnings, потом screenshot, чтобы посмотреть на результат глазами. Если вкладка не подключена, вызови open_planner."
].join("\n");

const AGENT_TOOLS = [
  {
    name: "get_plan",
    description: "Текущий план. summary даёт сжатое описание с id всех элементов, площадями, комнатой каждой мебели, подписями дверей и окон, предупреждениями и итогами. json даёт весь объект плана как в файле экспорта.",
    inputSchema: AG_OBJ({format: AG_E(["summary", "json"], "По умолчанию summary")})
  },
  {
    name: "get_view",
    description: "Что сейчас на экране: вкладка, режим 2D/3D, режим крыши и разреза, дата, время и погода, свет ламп, качество, камера, что выбрано, идёт ли рендер, скрыта ли вкладка.",
    inputSchema: AG_OBJ({})
  },
  {
    name: "list_catalog",
    description: "Каталог моделей для add_model: вид (kind), название, категория, размер w × d × h по умолчанию, высота над полом z и особенности (lamp, gate, fence, openings, kitchen). Фильтр по категории или по слову в названии.",
    inputSchema: AG_OBJ({cat: AG_S("Ключ категории, например living, bed, kitchen, bath, hall, light, build, yard, fence, people"), q: AG_S("Слово из названия, например диван")})
  },
  {
    name: "list_materials",
    description: "Материалы для set_material. Без target весь список с ключами и группами. С target части этого элемента (slot) и их текущий материал.",
    inputSchema: AG_OBJ({target: AG_S("id элемента или house"), group: AG_S("Ключ группы: floor, wall, facade, roof, wood, stone, paint, metal, fabric, glass, ground, plant")})
  },
  {
    name: "new_plan",
    description: "Заменить план новым. blank это пустой участок по размерам plot и месту site, как мастер нового участка. empty участок с одной комнатой. example и furnished готовые примеры дома (есть только в локальной версии). Текущий план остаётся в истории, Ctrl+Z его вернёт.",
    inputSchema: AG_OBJ({
      preset: AG_E(["blank", "empty", "example", "furnished"], "По умолчанию blank"),
      plot: AG_OBJ({w: AG_N("Ширина вдоль улицы"), d: AG_N("Глубина"), street: AG_N("Отступ от улицы"), side: AG_N("Отступ сбоку"), back: AG_N("Отступ сзади")}),
      site: AG_OBJ({city: AG_S("Город из списка приложения, например Москва"), lat: AG_N("Широта"), lon: AG_N("Долгота"), tz: AG_N("Часовой пояс, часы от UTC"), north: AG_N("Север от верха плана по часовой, градусы. 0 значит улица на юге")})
    })
  },
  {
    name: "load_plan",
    description: "Открыть план из JSON, как «Открыть файл». Принимает объект плана или {plan: план}. Всё проходит проверку, лишнее отбрасывается.",
    inputSchema: AG_OBJ({plan: {type: "object", description: "План в формате get_plan json"}}, ["plan"])
  },
  {
    name: "patch_plan",
    description: "Запасной путь для любой правки, под которую нет инструмента. Объекты plot, site, house сливаются по полям. В списках rooms, doors, windows, items, objects элемент с существующим id сливается с ним по полям, без id или с новым id добавляется. Поле nowall заменяется целиком. После слияния план проходит ту же проверку, что и файл.",
    inputSchema: AG_OBJ({patch: {type: "object", description: "Часть плана в формате get_plan json"}}, ["patch"])
  },
  {
    name: "set_plot",
    description: "Участок, место и забор участка. Город подставляет широту, долготу и пояс. Забор: вид вдоль улицы front и по бокам и сзади type, высота, ворота и калитка.",
    inputSchema: AG_OBJ({
      w: AG_N("Ширина участка вдоль улицы, 5-300"), d: AG_N("Глубина, 5-300"), street: AG_N("Отступ от улицы"), side: AG_N("Отступ сбоку"), back: AG_N("Отступ сзади"),
      city: AG_S("Город из списка приложения"), lat: AG_N("Широта"), lon: AG_N("Долгота"), tz: AG_N("Часовой пояс"), north: AG_N("Север от верха плана по часовой, градусы"),
      snap: {type: "number", enum: [0.05, 0.1, 0.5], description: "Шаг сетки"},
      fence: AG_OBJ({
        front: AG_E(AG_ENUMS.fence, "Вид забора вдоль улицы"), type: AG_E(AG_ENUMS.fence, "Вид по бокам и сзади"), h: AG_N("Высота, 0.5-3"),
        gate: AG_E(AG_ENUMS.gate, "Ворота"), gw: AG_N("Ширина ворот, 1.5-12"), gx: AG_N("Сдвиг ворот от середины улицы вправо"),
        wicket: AG_B("Есть калитка"), wside: {type: "number", enum: [1, -1], description: "Калитка справа (1) или слева (-1) от ворот"}
      })
    })
  },
  {
    name: "set_house",
    description: "Параметры дома: положение на участке, поворот, стены, высоты, крыша, дымоход, потолочный свет. Передавай только то, что меняешь.",
    inputSchema: AG_OBJ({
      cx: AG_N("Центр дома на участке по x"), cy: AG_N("Центр дома на участке по y"), left: AG_N("Расстояние от левой границы участка до дома"), from_street: AG_N("Расстояние от дома до красной линии"),
      rot: {type: "number", enum: [0, 90, 180, 270], description: "Поворот дома на участке"},
      wall: AG_N("Толщина наружных стен, 0.1-1"), inner: AG_N("Толщина перегородок, 0.05-0.4"), h: AG_N("Высота потолка, 2.2-5"), base: AG_N("Высота цоколя, 0-1.5"), doorH: AG_N("Высота дверных проёмов, 1.8-3"),
      roof: AG_E(AG_ENUMS.roof, "Тип крыши"), pitch: AG_N("Уклон, градусы 5-70"), pitch2: AG_N("Верхний уклон ломаной, 5-45"), ridge: AG_E(["long", "short"], "Конёк вдоль длинной или короткой стороны"),
      low: AG_E(["f", "b", "l", "r"], "Низкая сторона односкатной: спереди, сзади, слева, справа"), over: AG_N("Свес по карнизу, 0-1.5"), overG: AG_N("Свес по фронтону, 0-1.5"), hipCut: AG_N("Доля полувальмы, 0.15-0.7"),
      gutters: AG_B("Водостоки"), chim: AG_B("Дымоход"), chx: AG_N("Дымоход x в координатах дома"), chy: AG_N("Дымоход y в координатах дома"), chh: AG_N("Дымоход выше конька, 0.2-3"),
      autoLights: AG_B("Потолочный свет в комнатах сам в сумерках")
    })
  },
  {
    name: "add_room",
    description: "Добавить комнату-прямоугольник в координатах дома. Край, который ближе 25 см к краю соседней комнаты, прилипает к нему (magnet). Возвращает id.",
    inputSchema: AG_OBJ({
      name: AG_S("Название, по умолчанию как тип"), type: AG_E(AG_ROOM_TYPES, "Тип комнаты, от него цвет на плане и набор мебели"),
      x: AG_N("Левый край"), y: AG_N("Верхний край"), w: AG_N("Ширина по x"), d: AG_N("Глубина по y"),
      open: AG_B("Открытая комната: между двумя открытыми комнатами нет стены"), magnet: AG_B("Прилипать к соседним, по умолчанию да"), furnish: AG_B("Сразу обставить мебелью")
    }, ["type", "x", "y", "w", "d"])
  },
  {
    name: "add_opening",
    description: "Дверь, проём, арка или окно. С room ищет свободное место на стене этой комнаты (для окна на наружной), с x, y ставит на ближайшую стену не дальше 1.5 м от точки в координатах дома. Можно сразу задать размеры и способ открывания. Возвращает id.",
    inputSchema: AG_OBJ({
      kind: AG_E(["door", "entry", "open", "arch", "window"], "door межкомнатная, entry входная, open проём без двери, arch арка, window окно"),
      room: AG_S("id комнаты"), x: AG_N("Точка рядом со стеной, x"), y: AG_N("Точка рядом со стеной, y"),
      w: AG_N("Ширина проёма"), h: AG_N("Высота окна"), sill: AG_N("Высота подоконника от пола"),
      op: AG_S("Способ открывания. Дверь: swing, double, slide, slide2, pocket, fold. Окно: tiltturn, turn, tilt, slide, lift, fixed"),
      leaf: AG_E(AG_ENUMS.leaf, "Полотно двери"), n: {type: "number", enum: [0, 1, 2, 3, 4], description: "Створок окна, 0 сколько влезет"}, how: AG_E(["turn", "tilt"], "Как открыто поворотно-откидное"),
      side: {type: "number", enum: [1, -1], description: "Сторона открывания двери по оси поперёк стены"}, hinge: {type: "number", enum: [0, 1], description: "Петли у меньшей (0) или большей (1) координаты"},
      open: AG_N("Насколько открыто, 0-1"), full_wall: AG_B("Растянуть проём на всю общую стену двух комнат")
    }, ["kind"])
  },
  {
    name: "add_model",
    description: "Поставить модель из каталога. В доме координаты дома, на участке координаты участка. Без x, y и cx, cy модель встаёт в центр комнаты room, в центр дома или участка. Возвращает id, комнату и расстояния до стен.",
    inputSchema: AG_OBJ({
      kind: AG_S("Вид модели из list_catalog"), where: AG_E(["house", "plot"], "В дом или на участок. По умолчанию по категории: мебель в дом, постройки, сад, заборы и машины на участок"),
      room: AG_S("id комнаты, тогда в дом"), x: AG_N("Левый край модели без поворота"), y: AG_N("Верхний край модели без поворота"), cx: AG_N("Центр по x"), cy: AG_N("Центр по y"),
      rot: AG_N("Поворот по часовой, градусы"), w: AG_N("Ширина"), d: AG_N("Глубина"), h: AG_N("Высота"), z: AG_N("Высота над полом"), name: AG_S("Своё название"), snap: AG_B("Мебель у стены (шкаф, кровать, диван, тумба, техника) подвинуть к ближайшей стене и развернуть к ней спиной, остальное прилипает к стенам и соседям рядом. Только в доме"),
      fs: AG_E(AG_ENUMS.fence, "Вид забора у секции и ворот"), open: AG_N("Ворота-объект открыты, 0-1"),
      on: AG_B("Лампа включена"), k: AG_N("Цвет света лампы, кельвины 1800-7000"), lm: AG_N("Яркость лампы, люмены"),
      mods: {type: "array", items: AG_OBJ({t: AG_E(AG_ENUMS.kitMod, "Модуль кухни"), w: AG_N("Ширина модуля")}, ["t", "w"]), description: "Модули кухни слева направо, если смотреть спереди"},
      up: AG_B("Верхние шкафы кухни"),
      opens: {type: "array", items: AG_OBJ({kind: AG_E(AG_ENUMS.opKind), side: AG_E(["f", "b", "l", "r"], "Стена постройки"), c: AG_N("Сдвиг от середины стены вправо, если смотреть снаружи"), w: AG_N("Ширина"), h: AG_N("Высота"), sill: AG_N("Высота окна над полом"), op: AG_E(AG_ENUMS.opOp, "gate: sectional, swing2, slide, roller. door: swing. win: turn, fixed"), open: AG_N("0-1"), hinge: {type: "number", enum: [0, 1]}}, ["kind", "side"]), description: "Ворота, двери и окна гаража, бани или сарая"}
    }, ["kind"])
  },
  {
    name: "update",
    description: "Поменять поля любого элемента по id. Комната: name, type, x, y, w, d, open, сдвиг x или y везёт с собой её двери, окна и мебель (carry: false отключает). Дверь: x, y, o, w, kind, op, leaf, side, hinge, open, full_wall. Окно: x, y, o, w, h, sill, op, n, how, open. Мебель и объект: name, x, y, cx, cy, w, d, h, z, rot, from_street, snap, fs, open, on, k, lm, mods, up, opens. Новая ширина без нового x держит центр, как в панели.",
    inputSchema: AG_OBJ({id: AG_S("id элемента"), set: {type: "object", description: "Поля и новые значения"}}, ["id", "set"])
  },
  {
    name: "remove",
    description: "Удалить элементы по id. Комната удаляется вместе со своими дверями, окнами и мебелью, как в редакторе.",
    inputSchema: AG_OBJ({ids: {type: "array", items: {type: "string"}, description: "id элементов"}}, ["ids"])
  },
  {
    name: "transform",
    description: "Действия редактора над выбранным. move сдвигает на dx, dy (комната со своими дверями, окнами и мебелью, дверь и окно только вдоль стены). rotate поворачивает на 90° по часовой, как клавиша R (комнату вокруг центра вместе со всем, несколько моделей вокруг центра группы). duplicate делает копию рядом. align выравнивает несколько моделей: l, r, t, b по краю, cx, cy по середине, dx, dy распределяет поровну.",
    inputSchema: AG_OBJ({
      ids: {type: "array", items: {type: "string"}, description: "id элементов. Для align и группы только мебель или только объекты участка"},
      op: AG_E(["move", "rotate", "duplicate", "align"]), dx: AG_N("Сдвиг по x"), dy: AG_N("Сдвиг по y"), mode: AG_E(["l", "r", "t", "b", "cx", "cy", "dx", "dy"], "Для align")
    }, ["ids", "op"])
  },
  {
    name: "set_wall",
    description: "Убрать стену между двумя комнатами целиком или вернуть её, как инструмент «Убрать стену». Двери на этой стене удаляются. Наружную стену убрать нельзя.",
    inputSchema: AG_OBJ({a: AG_S("id первой комнаты"), b: AG_S("id второй комнаты"), wall: AG_B("true вернуть стену, false убрать")}, ["a", "b", "wall"])
  },
  {
    name: "furnish_room",
    description: "«Обставить комнату»: заменить мебель в комнате набором по её типу. Наборы есть у спальни, гостиной, кухни, столовой, санузла, прихожей, а по названию у «Кабинет» и «Детская». Проходы у дверей остаются свободными.",
    inputSchema: AG_OBJ({id: AG_S("id комнаты")}, ["id"])
  },
  {
    name: "set_material",
    description: "Материал и цвет части элемента. Части смотри в list_materials с target. Можно дать только material, только color или оба. reset возвращает часть или все части к материалам по умолчанию.",
    inputSchema: AG_OBJ({target: AG_S("id элемента или house"), slot: AG_S("Часть, например floor, wall, facade, roof, leaf, top, legs"), material: AG_S("Ключ материала из list_materials"), color: AG_S("Цвет #rrggbb"), reset: AG_B("Сбросить часть, а без slot все части")}, ["target"])
  },
  {
    name: "open_close",
    description: "Открыть или закрыть дверь, окно, ворота-объект, ворота и калитку забора участка, ворота, двери и окна построек. У лампы щёлкает выключателем. Без value переключает.",
    inputSchema: AG_OBJ({id: AG_S("id элемента или fence для забора участка"), part: AG_S("Для fence: gate или wicket. Для постройки: id проёма из opens"), value: AG_N("Насколько открыть, 0-1")}, ["id"])
  },
  {
    name: "gaps",
    description: "Расстояния от модели до стен в четыре стороны (у мебели до граней стен, у объектов и дома до границ участка). С dir и value сдвигает так, чтобы расстояние стало value. dir: l, r, u, d, у мебели ещё f до пола и c до потолка.",
    inputSchema: AG_OBJ({id: AG_S("id мебели, объекта или house"), dir: AG_E(["l", "r", "u", "d", "f", "c"]), value: AG_N("Нужное расстояние")}, ["id"])
  },
  {
    name: "set_view",
    description: "Что показывать: вкладка, 2D или 3D, крыша и разрез, подписи, забор, лента времени, тема, панель свойств, качество 3D, выделение элементов, вписать план.",
    inputSchema: AG_OBJ({
      tab: AG_E(["plot", "house"], "Вкладка Участок или Дом"), view: AG_E(["2d", "split", "3d"]), mode: AG_E(["roof", "noroof", "cut"], "С крышей, без крыши, разрез"),
      cut_side: AG_E(["top", "front", "back", "left", "right"]), cut_pos: AG_N("Положение разреза 0-1"),
      labels: AG_B("Подписи в 3D"), fence: AG_B("Забор в 3D"), sunbar: AG_B("Лента времени"), theme: AG_E(["auto", "light", "dark"]), panel: AG_B("Панель свойств справа"), quality: AG_E(AG_ENUMS.quality),
      select: {type: ["string", "array", "null"], items: {type: "string"}, description: "id, список id мебели или объектов, house или null"}, fit: AG_B("Вписать план в окно")
    })
  },
  {
    name: "camera",
    description: "Камера 3D. preset готовый вид. from и to ставят камеру в точку и смотрят на точку: [x, y, высота] в координатах участка, высота над землёй, или в координатах дома (coords: house), высота над полом, без высоты 1.6. focus подлетает к элементу. walk включает и выключает прогулку. window ставит камеру в комнату перед окном лицом наружу.",
    inputSchema: AG_OBJ({
      preset: AG_E(AG_ENUMS.cam), from: AG_P3("[x, y, высота] камеры"), to: AG_P3("[x, y, высота] куда смотреть"), coords: AG_E(["plot", "house"], "По умолчанию plot"),
      focus: AG_S("id элемента или house"), walk: AG_B("Прогулка"), window: AG_S("id окна"), fov: AG_N("Угол зрения по вертикали, 20-90")
    })
  },
  {
    name: "set_sky",
    description: "Дата, время, погода, шаблон света, лампы, ход времени и состояние погоды (снег, мокрое, лужи, ветер). Возвращает восход, заход и высоту солнца.",
    inputSchema: AG_OBJ({
      month: AG_N("1-12"), day: AG_N("1-31"), time: AG_S("Время ЧЧ:ММ"), weather: AG_E(AG_ENUMS.weather), light: AG_E(AG_ENUMS.light, "Шаблон света: день, золотой час, вечер, ночь, светлый интерьер"),
      lamps: AG_E(AG_ENUMS.lamps, "Общий выключатель ламп"), play: AG_B("Время идёт само"), speed: {type: "number", enum: [10, 60, 180], description: "Минут за секунду"}, path: AG_B("Показать путь солнца"),
      snow: AG_N("Снег 0-1"), wet: AG_N("Мокрое 0-1"), puddles: AG_N("Лужи 0-1"), wind: AG_N("Ветер, м/с 0-30"), wind_dir: AG_N("Откуда дует, градусы")
    })
  },
  {
    name: "sun_info",
    description: "Солнце на дату: восход, заход, высота, часы солнца на каждом фасаде и прямое солнце в комнатах через окна. map считает карту солнца на участке с тенями от дома, построек, деревьев и забора и даёт долю участка с 6 и 4 часами солнца, часы в точках points и картинку.",
    inputSchema: AG_OBJ({month: AG_N("1-12, по умолчанию как на экране"), day: AG_N("1-31"), map: AG_B("Посчитать карту солнца"), points: {type: "array", items: AG_P3("[x, y] в координатах участка"), description: "Точки для часов солнца"}})
  },
  {
    name: "measure",
    description: "Рулетка: показать замер между двумя точками на плане и в 3D и вернуть расстояние. Точки [x, y, высота от пола], высота необязательна. clear убирает замер.",
    inputSchema: AG_OBJ({from: AG_P3("Первая точка"), to: AG_P3("Вторая точка"), coords: AG_E(["house", "plot"], "По умолчанию house"), clear: AG_B("Убрать замер")})
  },
  {
    name: "boq",
    description: "Ведомость объёмов для сметы: кладка, фасад, перегородки, полы и стены по материалам, плинтус, окна и двери, кровля, забор, мощение. Строки [раздел, название, количество, единица].",
    inputSchema: AG_OBJ({})
  },
  {
    name: "screenshot",
    description: "Картинка, чтобы посмотреть на результат. 3d рендерит вид текущей камеры (или вид view, камера пользователя при этом не двигается). plan_house и plan_plot дают чертёж плана дома или участка с размерами.",
    inputSchema: AG_OBJ({
      what: AG_E(["3d", "plan_house", "plan_plot"], "По умолчанию 3d"), view: AG_E(AG_ENUMS.cam, "Готовый вид только для этого снимка"), mode: AG_E(["roof", "noroof", "cut"], "Режим крыши для снимка"),
      width: AG_N("Ширина, по умолчанию 1280, не больше 2048"), height: AG_N("Высота, по умолчанию по пропорциям окна 3D от 1,25:1 до 1,9:1"), quality: AG_E(["draft", "good", "best"], "draft несколько секунд, best мягкие тени, по умолчанию good"),
      dof: {type: "number", enum: [0, 1, 2, 3], description: "Размытие фона, фокус в центре кадра"}
    })
  },
  {
    name: "export",
    description: "Скачать файл у пользователя, как из меню «Файл» и «Экспорт». Файл появится в папке загрузок браузера. Видео, ZIP, панорама и лист A3 считаются от 15 секунд до пары минут, если не успели за 40 секунд, инструмент вернётся раньше, а файл скачается сам.",
    inputSchema: AG_OBJ({
      kind: AG_E(["json", "plan_png", "plan_svg", "boq_csv", "render", "zip", "video_orbit", "video_day", "pano", "print"], "json файл плана, plan_png и plan_svg чертёж, boq_csv смета, render рендер вида, zip рендеры со всех сторон, video_orbit облёт, video_day день, pano панорама 360, print лист A3"),
      which: AG_E(["house", "plot"], "Для plan_png и plan_svg, по умолчанию открытая вкладка")
    }, ["kind"])
  },
  {
    name: "history",
    description: "Отменить или вернуть последние шаги, как Ctrl+Z и Ctrl+Y.",
    inputSchema: AG_OBJ({action: AG_E(["undo", "redo"]), steps: AG_N("Сколько шагов, по умолчанию 1")}, ["action"])
  }
];
