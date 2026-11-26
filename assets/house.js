export function mountHouse(viewport, openView) {
  viewport.innerHTML = `
    <svg class="home-model" viewBox="30 -40 680 540" role="img" aria-labelledby="model-title model-desc">
      <title id="model-title">马冬阳和王琦的小家</title>
      <desc id="model-desc">带有木地板、沙发、书桌、书架和落地灯的立体透视小家。下方按钮可以打开日记和相册。</desc>
      <defs>
        <linearGradient id="floor-color" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e3be91"/><stop offset="1" stop-color="#c99e76"/></linearGradient>
        <linearGradient id="wall-color" x2="0" y2="1"><stop stop-color="#f8eee0"/><stop offset="1" stop-color="#dfd4c1"/></linearGradient>
        <linearGradient id="glass-color" x2="0" y2="1"><stop stop-color="#adc8c2"/><stop offset="1" stop-color="#dce9d9"/></linearGradient>
        <linearGradient id="sofa-top" x2="0" y2="1"><stop stop-color="#9ba995"/><stop offset="1" stop-color="#7f947d"/></linearGradient>
        <radialGradient id="light-glow"><stop stop-color="#ffda8f" stop-opacity=".5"/><stop offset="1" stop-color="#ffe8b3" stop-opacity="0"/></radialGradient>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
        <pattern id="floor-grain" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .5 -1 .5 0 0)"><rect width="36" height="36" fill="none"/><path d="M0 0h36M0 18h36M18 0v18M0 18v18" stroke="#9a795a" stroke-opacity=".2" stroke-width="1"/></pattern>
      </defs>
      <ellipse cx="376" cy="451" rx="232" ry="22" fill="#795b46" opacity=".13" filter="url(#soft-shadow)"/>
      <!-- The wall and furniture faces share one isometric projection. -->
      <path d="m92 300 266-140 296 150-268 141Z" fill="#9c785d"/>
      <path d="m92 300 294 151v12L92 313Z" fill="#a17c5e"/>
      <path d="m386 451 268-141v13L386 463Z" fill="#be9470"/>
      <path d="m92 300 266-140 296 150-268 141Z" fill="url(#floor-color)"/>
      <path d="m92 300 266-140 296 150-268 141Z" fill="url(#floor-grain)"/>
      <path d="m92 300 0-179L358-19v179Z" class="room-wall-left" fill="url(#wall-color)"/>
      <path d="m358-19 296 150v179L358 160Z" class="room-wall-right" fill="#e4dbc9"/>
      <path d="m92 121 0-8L358-27 296 150v8L358-19Z" fill="#faf1e5"/>
      <path d="m92 300 266-140M358 160l296 150" fill="none" stroke="#b9aa92" stroke-width="6"/>
      <path d="m92 122 0 178 294 151M654 131v179L386 451" fill="none" stroke="#fff3df" stroke-width="3" opacity=".55"/>
      <!-- Deep-set window, frame and curtains. -->
      <path d="m137 141 121-64v110l-121 64Z" fill="#c4b194"/>
      <path d="m143 144 109-57v94l-109 57Z" class="window-glass" fill="url(#glass-color)"/>
      <path d="m144 216 109-58v24l-109 57Z" fill="#bad1bd" opacity=".5"/>
      <path d="m151 196 27-43 22 15 22-41 30 24v31l-109 57Z" fill="#91afa2" opacity=".35"/>
      <path d="m197 115 0 94m-54-17 109-57" stroke="#f5efdf" stroke-width="5"/>
      <path d="m134 141 0 114 128-68v-8l-122 64V138Z" fill="#f7efdd"/>
      <path d="m128 141 9-5v113l-9 5Z" fill="#d2b29e"/>
      <path d="m258 72 12-6v114l-12 7Z" fill="#ceb09b"/>
      <path d="m131 136 136-71" stroke="#b89a7b" stroke-width="3"/>
      <!-- Framed artwork. -->
      <path d="m402 65 65 33v65l-65-33Z" fill="#ac8667"/>
      <path d="m407 73 55 28v53l-55-28Z" fill="#faf1df"/>
      <path d="m414 115 14-13 9 18 9-9 10 27-42-21Z" fill="#a5b19a"/>
      <ellipse cx="445" cy="109" rx="6" ry="9" transform="rotate(-20 445 109)" fill="#d8ac71"/>
      <!-- Low bookshelf against the right wall. -->
      <path d="m485 220 95 48 0 62-95-48Z" fill="#a17c5c"/>
      <path d="m580 268 34-18v62l-34 18Z" fill="#8a694e"/>
      <path d="m485 220 34-18 95 48-34 18Z" fill="#c9a480"/>
      <path d="m491 231 82 42v45l-82-42Z" fill="#725b46"/>
      <path d="m491 254 82 42" stroke="#ba9472" stroke-width="4"/>
      <path d="m500 238 8 4v17l-8-4Zm11 6 7 4v17l-7-4Z" fill="#9ca994"/>
      <path d="m521 249 7 4v17l-7-4Zm11 5 9 5v17l-9-5Z" fill="#d9b18c"/>
      <path d="m547 263 9 4v17l-9-5Z" fill="#b97969"/>
      <path d="m505 270 26 13v8l-26-13Z" fill="#d7c6ab"/>
      <path d="m537 286 20 10v8l-20-10Z" fill="#8faaa4"/>
      <!-- Flower vase on the cabinet. -->
      <path d="m551 236-1-13 13 6-2 12q-5 4-10-5Z" fill="#c98b74"/>
      <path d="m556 224-2-25m4 26 7-17m-10 11-8-16" stroke="#83957a" stroke-width="2" fill="none"/>
      <circle cx="554" cy="199" r="5" fill="#eac4b2"/><circle cx="566" cy="207" r="4" fill="#ead3a3"/><circle cx="546" cy="204" r="4" fill="#e6baaf"/>
      <!-- Woven rug. -->
      <path d="m221 328 125-66 171 87-125 66Z" fill="#8d755c" opacity=".1"/>
      <path d="m211 324 126-66 171 87-126 66Z" fill="#eee4cc"/>
      <path d="m228 324 109-57 154 78-109 57Z" fill="none" stroke="#c9bda4" stroke-width="2"/>
      <path d="m266 325 73-38 113 57-73 38Z" fill="none" stroke="#c0b7a1" stroke-width="1.5"/>
      <!-- Sofa: rear, seat, arm rests, feet. -->
      <path d="m150 282 126-66 56 28-126 67Z" fill="#a3b09a"/>
      <path d="m150 282 0-52 126-66v52Z" fill="#8c9f88"/>
      <path d="m150 230 12-7 126-66-12 7Z" fill="#b3bfa9"/>
      <path d="m150 282 56 29v28l-56-29Z" fill="#71856f"/>
      <path d="m206 311 126-67v28l-126 67Z" fill="#7e9279"/>
      <path d="m155 282 54 27 116-61-49-26Z" fill="url(#sofa-top)"/>
      <path d="m214 252 50 27" stroke="#677d69" stroke-width="2" opacity=".5"/>
      <path d="m145 268 15-8 53 28v23l-16 8-52-27Z" fill="#8a9e86"/>
      <path d="m145 268 52 27 16-7-53-28Z" fill="#acbaa1"/>
      <path d="m273 201 15-8 51 26v25l-14 7-52-26Z" fill="#8c9f87"/>
      <path d="m273 201 52 27 14-9-51-26Z" fill="#aebba3"/>
      <path d="m164 311v10l8 4v-10m132-30v11l8-4v-11" stroke="#755740" stroke-width="5"/>
      <path d="m175 246 21-12 26 15-21 14Z" fill="#eed7bd"/>
      <path d="m230 218 22-11 20 12-20 13Z" fill="#d1a494"/>
      <!-- Coffee table. -->
      <ellipse cx="358" cy="339" rx="51" ry="25" fill="#695445" opacity=".14"/>
      <path d="m319 326 0 25m72-23v25m-39-4v22" stroke="#946f50" stroke-width="6"/>
      <ellipse cx="357" cy="319" rx="51" ry="25" fill="#a87954"/>
      <ellipse cx="357" cy="315" rx="51" ry="25" fill="#e0be8f"/>
      <path d="m327 310 24-13 28 14-24 13Z" fill="#b77367"/>
      <path d="m327 310 28 14v5l-28-14Z" fill="#8c514f"/>
      <path d="m331 310 20-10 24 12-20 10Z" fill="#f5dfc6"/>
      <ellipse cx="382" cy="317" rx="9" ry="5" fill="#b89c7b"/>
      <path d="m375 310 1 10q7 7 14-1v-10Z" fill="#fff2dd"/>
      <ellipse cx="382" cy="309" rx="8" ry="4" fill="#d8c3a7"/>
      <!-- Desk and notebook by the window. -->
      <path d="m279 198 47-25 55 28-47 25Z" fill="#ddba91"/>
      <path d="m279 198 55 28v7l-55-28Zm55 28 47-25v7l-47 25Z" fill="#b38c66"/>
      <path d="m286 208 0 43m41-21v42m47-59v42" stroke="#a17a57" stroke-width="5"/>
      <path d="m298 193 21-11 28 14-21 11Z" fill="#7f9b95"/>
      <path d="m301 193 18-9 24 12-18 9Z" fill="#f5edda"/>
      <path d="m319 187 14 7m-17-4 14 7" stroke="#b6b4a1" stroke-width="1"/>
      <!-- Tall plant. -->
      <ellipse cx="582" cy="352" rx="25" ry="11" fill="#8b725c" opacity=".18"/>
      <path d="m563 329 6 23q15 13 27-1l5-22Z" fill="#c28b70"/>
      <ellipse cx="582" cy="329" rx="19" ry="9" fill="#ddb297"/>
      <ellipse cx="582" cy="327" rx="15" ry="6" fill="#816b52"/>
      <path d="m582 326-3-76m2 52-22-28m22 15 24-29m-24 15-16-31" stroke="#7d8f6e" stroke-width="3" fill="none"/>
      <path d="M579 270q-29-4-22-33 25 2 22 33Zm3 22q27-3 31-30-25-3-31 30Zm-3 18q-30-1-33-27 29-3 33 27Zm-1-49q17-7 13-30-23 9-13 30Z" fill="#8fa884"/>
      <path d="m581 291q21 5 28-12-19-9-28 12Z" fill="#adc09b"/>
      <!-- Floor lamp and its light. -->
      <ellipse class="lamp-glow" cx="446" cy="289" rx="92" ry="62" fill="url(#light-glow)" opacity="0"/>
      <ellipse cx="457" cy="339" rx="22" ry="11" fill="#ad926d"/>
      <path d="M457 333V220" stroke="#97795a" stroke-width="4"/>
      <path d="m436 207-7 28q28 18 55-1l-10-27Z" class="lamp-shade" fill="#f6e1b6" stroke="#d8c19a" stroke-width="1"/>
      <ellipse cx="455" cy="207" rx="19" ry="8" fill="#f9edcf"/>
      <ellipse cx="456" cy="236" rx="27" ry="9" fill="#e7c990" opacity=".65"/>
      <!-- A little framed photograph on the desk. -->
      <path d="m359 188 13 7v17l-13-7Z" fill="#986d56"/>
      <path d="m362 193 7 4v10l-7-4Z" fill="#e6d5b8"/>
      <path d="m363 200 3-2 3 7-6-3Z" fill="#97ac93"/>
    </svg>
    <div class="room-hotspots">
      <button class="room-link" type="button" data-room-view="diary">打开桌上的日记 <span>↗</span></button>
      <button class="room-link" type="button" data-room-view="gallery">看看我们的照片 <span>↗</span></button>
    </div>`;
  viewport.querySelectorAll('[data-room-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.roomView)));
}
