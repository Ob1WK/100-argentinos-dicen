# 100 Argentinos Dicen — tablero para jugar en casa

Tablero estilo "100 Argentinos Dicen" para jugar con amigos o en eventos: una **pantalla** para la tele o el proyector y un **panel de operador** para el presentador, que maneja todo desde el celular o la compu.

- **`/`** → la pantalla del juego. Tocá una vez para activar el sonido y la pantalla completa (después: tecla **F** o doble click).
- **`/admin`** → el panel del operador. La pantalla se actualiza sola con cada cosa que hacés.

Trae **44 preguntas** con sus puntajes, que podés editar, borrar o reemplazar desde el panel.

> Proyecto hecho por fans, sin relación con el programa ni con el canal.

## Cómo se juega desde /admin

| Acción | Botón | Atajo |
| --- | --- | --- |
| Pasar del logo al tablero | Logo / Tablero | |
| Mostrar el conteo de puntos animado | Puntajes | P |
| Elegir pregunta | lista o ← Anterior / Siguiente → | ← → |
| Mostrar la pregunta arriba | Mostrar pregunta | Q |
| Dar vuelta una respuesta (suma al pozo) | tocar la respuesta | 1–8 |
| Respuesta incorrecta (cuenta como error) | ✕ Incorrecta | X |
| X sin contar (cara a cara / robo) | Mostrar ✕ sola | Z |
| Puntos dobles / triples | Simple / Doble / Triple | |
| Entregar el pozo a una familia | Dar N a … | |
| Destapar lo que faltó al final (no suma) | Destapar todas | |

Los nombres de las familias, los puntajes y el título del logo también se cambian desde el panel.

## Armá tu propio juego (gratis, en Vercel)

1. Hacé un **fork** de este repositorio (botón "Fork" arriba a la derecha en GitHub).
2. Entrá a [vercel.com/new](https://vercel.com/new), importá tu fork y tocá **Deploy**. No hace falta tocar ninguna configuración.
3. **Base de datos (obligatoria):** entrá a [vercel.com/marketplace/upstash](https://vercel.com/marketplace/upstash) → **Install** en **Upstash for Redis** → plan **Free** → conectala a tu proyecto (Production y Preview). Sin esto, la pantalla y el panel no se sincronizan.
4. **Contraseña del panel (recomendada):** en tu proyecto de Vercel → **Settings → Environment Variables**, agregá `ADMIN_PASSWORD` con la clave que quieras. Sin ella, cualquiera que tenga el link de `/admin` puede manejar el juego.
5. En **Deployments**, tocá **Redeploy** en el último deploy para que tome la base y la contraseña.

Listo: abrí `https://tu-proyecto.vercel.app` en la tele y `https://tu-proyecto.vercel.app/admin` en el celular.

## Cambiar las preguntas

- **Desde el panel:** "Editar preguntas" → agregar, editar, borrar, o "Importar / exportar JSON" para pegar una lista entera.
- **Desde el código:** editá [lib/questions.js](lib/questions.js); esas son las preguntas que se cargan por defecto (y las que vuelven con "Restaurar originales").

Cada pregunta admite hasta 8 respuestas; se ordenan solas de mayor a menor puntaje.

## Correr en tu compu

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 (pantalla) y http://localhost:3000/admin (operador). En local no hace falta Redis: el estado se guarda en memoria mientras el servidor esté prendido.

Hecho con Next.js. Los sonidos se generan con Web Audio, sin archivos de audio.
