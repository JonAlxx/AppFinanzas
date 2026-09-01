# FinanzasApp 📱💼

> [!NOTE]
> **Versión Actual:** `v1.0.16` (Release). Incluye gestión bancaria avanzada de Tarjetas de Crédito (Pago del Periodo corte a corte, compras a meses MSI/MCI, reversión total al eliminar transacciones, saldos a favor) y Presupuestos inteligentes con Rollover y metas de ahorro.

**FinanzasApp** es una aplicación móvil premium de finanzas personales desarrollada en **React Native** utilizando **Expo**. Está diseñada para permitir a los usuarios gestionar sus ingresos, gastos, transferencias entre cuentas, presupuestos y metas de ahorro de forma local y segura, con una experiencia visual fluida, moderna y adaptada al mercado mexicano.

---

## ✨ Características Principales

### 1. Panel de Control (Dashboard)
* **Resumen de Saldos:** Visualización del saldo neto combinando efectivo y cuentas de débito, así como el saldo deudor total en tarjetas de crédito.
* **Privacidad (Modo Incógnito):** Permite ocultar los saldos en pantalla con un solo toque (`balanceHidden` toggles `••••••••`).
* **Accesos Rápidos:** Botones interactivos para registrar movimientos rápidamente y navegar a los módulos de Metas, Suscripciones, Calendario, Presupuestos y Ajustes.
* **Tendencia de Gastos:** Minigráfico de barras que ilustra el gasto acumulado en los últimos 7 días.
* **Tarjetero Deslizable:** Carrusel de tarjetas bancarias configuradas, con estilos visuales que se adaptan a su marca.

### 2. Gestión Bancaria de Cuentas y Tarjetas de Crédito 💳
* Soporte para múltiples tipos de cuentas: *Efectivo, Banco, Tarjeta de Débito, Tarjeta de Crédito, Ahorro, Inversión y Monedero Digital*.
* **Branding Mexicano e Internacional:** Personalización automática de colores y logotipos según el proveedor (BBVA, Nu, Banamex, Santander, HSBC, Banorte, American Express, Mercado Pago, RappiCard, Klar, etc.).
* **Pago del Periodo (Corte a Corte):** Cálculo exacto que suma únicamente las compras de contado del ciclo activo más 1 parcialidad de cada compra a meses (MSI/MCI).
* **Avance Progresivo a Meses (MSI / MCI):** Registrar el Pago del Periodo avanza las compras activas por $+1$ mensualidad (`1 de 3 pagados`), reseteando la obligación del periodo a `✅ ¡Periodo al corriente! ($0.00)` hasta la llegada del siguiente corte.
* **Reversión Total al Eliminar Transacciones:** La eliminación de un pago registrado restaura atómicamente la deuda de la tarjeta, las cuotas pendientes (`0 de 3 pagados`) y el saldo exacto del periodo sin desajustes.
* **Manejo de Saldo a Favor:** Identificación en verde brillante (`🟢 SALDO A FAVOR`), incrementando el crédito disponible y absorbiendo automáticamente futuros cargos o parcialidades.
* **Detalle Interactivo de Compras a Meses:** Calendario mes a mes de cuotas (`PAGADO`, `PRÓXIMO`, `PENDIENTE`) con desglose visual de categoría, tarjeta y plazo.

### 3. Registro de Transacciones con Teclado Numérico Personalizado 🔢
* Formulario interactivo para registrar **Ingresos**, **Gastos** y **Transferencias entre cuentas**.
* **Teclado Virtual Pinned (Numpad):** Diseñado a medida dentro de la aplicación para una entrada de montos ágil y precisa.
* Asignación de categorías (con iconos personalizados), notas y cuentas de origen/destino.

### 4. Presupuestos Inteligentes con Rollover y Metas 📊
* Permite fijar límites de gasto por categoría con periodos flexibles: *Semanal, Quincenal (días 1–15 / 16–30), Mensual o Días/Rangos Personalizados* mediante calendario interactivo.
* **Anillos de Progreso SVG & Alertas Dinámicas:** Animación circular con semáforo inteligente de consumo:
  * 🟢 **Verde (`PRESUPUESTO CONTROLADO`):** Gasto bajo control.
  * 🟡 **Naranja (`¡PRESUPUESTO CASI AGOTADO!`):** Umbral de advertencia alcanzado ($\ge 80\%$).
  * 🔴 **Rosa/Rojo (`¡LÍMITE EXCEDIDO!`):** Presupuesto excedido ($\ge 100\%$).
* **Gestión de Sobrantes ("Saldo a Favor Detectado"):** Al finalizar un periodo con saldo a favor, el motor sugiere automáticamente:
  1. **Sumar al actual (Rollover):** Acumular el ahorro como saldo extra disponible para el siguiente periodo.
  2. **Ahorrar en Meta:** Transferir automáticamente el dinero sobrante directamente a una **Meta de Ahorro**.
  3. **Reiniciar normal:** Comenzar el ciclo con el presupuesto base.

### 5. Metas de Ahorro 🎯
* Definición de objetivos financieros (ej. fondo de emergencia, viajes).
* Registro de meta deseada, saldo actual, fecha límite y vinculación a una cuenta de ahorro.
* Barra de progreso porcentual que indica el avance y el monto restante requerido.

### 6. Transacciones Recurrentes y Suscripciones (Materialización Automática) 🔄
* Creación de reglas para cobros e ingresos recurrentes (*semanal, quincenal, mensual o anual*).
* Integración con marcas de suscripción populares (Netflix, Spotify, Prime Video, Disney+, Max, etc.).
* **Motor de Auto-Materialización:** Al iniciar, la aplicación calcula en segundo plano si han pasado fechas de pago programadas y genera automáticamente las transacciones correspondientes en el historial sin intervención del usuario.

### 7. Calendario de Pagos 📅
* Cuadrícula mensual detallada que marca con puntos de color los días con cobros u otros movimientos programados (verde para ingresos, rosa para egresos/pagos).
* Previsión del **Saldo Neto del día** para facilitar la planeación del flujo de caja.

### 8. Análisis y Reportes Visuales 📈
* **Gráfico de Donut Interactiva:** Muestra de forma porcentual la distribución de gastos por categoría en rangos de 7, 30 y 90 días.
* **Comparativa Mensual:** Gráfico de barras duales que contrasta ingresos frente a gastos de los últimos 6 meses.
* Lista de categorías ordenadas por volumen de gasto.

### 9. Seguridad Biométrica y Privacidad 🔒
* Bloqueo de la aplicación mediante **Reconocimiento Facial (Face ID / Rostro)** o **Huella Digital** a través de `expo-local-authentication`.
* Si está activo, protege la información sensible bloqueando la interfaz en cada inicio de sesión.

### 10. Exportación de Datos 📤
* Generación de reportes de transacciones en formato estándar **CSV**.
* Integración con `expo-sharing` para compartir el archivo exportado a través de correos, aplicaciones de mensajería (WhatsApp, Telegram) o guardarlo localmente.

### 11. Notificaciones Locales y Recordatorios Inteligentes 🔔
* **Recordatorios en Tiempo Real:** Envío de alertas locales directamente al celular para avisar sobre cobros o ingresos programados por ocurrir.
* **Personalización Completa:** Pantalla premium dedicada a la configuración de alertas en donde el usuario puede definir:
  * **Anticipación:** Configuración de días de aviso previo (1, 2, 3, 5 o 7 días antes).
  * **Frecuencia Diaria:** Elegir recibir avisos 1 vez al día o 2 veces al día (horarios independientes).
  * **Reloj Digital Premium:** Ajustar la hora exacta mediante un control digital interactivo (horas, minutos y selector AM/PM) con vibración háptica al interactuar.
* **Mensajes Dinámicos Contextuales:** Las alertas muestran textos claros y personalizados en español como: *"Faltan X días para tu pago de [Concepto] de la cantidad de $ [Monto] pesos"* (o *"Faltan X días para tu ingreso de..."*).
* **Auto-Rescheduling Automático:** Cada vez que el usuario crea o edita un movimiento recurrente, o cambia sus horarios en los ajustes, la app recalcula y reprograma todas las alarmas exactas nativas en segundo plano.

---

## 🛠️ Tecnologías y Librerías Utilizadas

* **Framework:** React Native + Expo (SDK ~54.0.35)
* **Lenguaje:** TypeScript
* **Notificaciones Locales:** `expo-notifications` configurado con canales Android de alta prioridad y permisos avanzados de alarmas exactas (`SCHEDULE_EXACT_ALARM` y `POST_NOTIFICATIONS`) para garantizar la entrega en Android 13+ (Xiaomi, etc.).
* **Efectos Hápticos:** `expo-haptics` para generar vibraciones premium (micro-devoluciones táctiles) al configurar la hora en el reloj interactivo.
* **Estilos y Diseño:** CSS Vanilla con componentes estructurados mediante Flexbox. Paleta de colores armoniosa con soporte nativo de **Tema Claro y Tema Oscuro** (`ThemeContext`).
* **Gestión del Estado:** Context API (`AppStateContext`) y Reductor nativo de React (`useReducer`) para control síncrono del estado global.
* **Persistencia:** `@react-native-async-storage/async-storage` para almacenamiento local persistente de movimientos, configuraciones, tiempos de alerta y estado de seguridad.
* **Gráficos e Ilustración:** `react-native-svg` (para el Donut Chart) y `expo-linear-gradient` (para fondos difuminados premium).
* **Fuentes:** Google Fonts (`Plus Jakarta Sans`).

---

## 📂 Estructura del Código

```bash
AppFinanzas/
├── assets/                 # Recursos multimedia, logotipos de tarjetas y splash screen.
├── src/
│   ├── components/         # Componentes visuales reutilizables (BankCard, DonutChart, Numpad, BottomBar, etc.).
│   ├── data/
│   │   ├── catalog.ts      # Categorías por defecto, marcas bancarias de México y servicios de suscripción.
│   │   ├── export.ts       # Utilidad para formatear y exportar datos a CSV.
│   │   ├── format.ts       # Funciones para formatear fechas e importes en pesos mexicanos (MXN).
│   │   ├── selectors.ts    # Consultas y selectores de datos (balances, series temporales, materialización de recurrentes).
│   │   └── types.ts        # Declaraciones de tipos e interfaces TypeScript.
│   ├── icons/
│   │   └── Icon.tsx        # Set de iconos vectoriales optimizados en SVG.
│   ├── navigation/
│   │   ├── AppRouter.tsx   # Enrutador personalizado para pantallas y barra de navegación inferior.
│   │   ├── NavigationContext.tsx
│   │   └── routes.ts       # Definición del árbol de rutas de la aplicación.
│   ├── screens/            # Pantallas completas (Dashboard, Transactions, AddTransaction, Budgets, Security, etc.).
│   ├── state/
│   │   ├── AppStateContext.tsx # Proveedor de estado global y efecto de auto-materialización.
│   │   ├── persistence.ts      # Lectura y escritura con AsyncStorage.
│   │   └── reducer.ts          # Acciones del reductor de finanzas.
│   └── theme/
│       ├── ThemeContext.tsx    # Contexto para alternar entre modo oscuro y claro.
│       └── theme.ts            # Tokens de colores y variables del sistema de diseño.
├── App.tsx                 # Archivo de inicio y bootstrapping de fuentes, carga de estado y pantallas de bloqueo/onboarding.
├── app.json                # Configuración de compilación e identificación del proyecto Expo.
└── package.json            # Scripts de ejecución y dependencias del proyecto.
```

---

## 🚀 Instalación y Ejecución

Para iniciar el proyecto en tu entorno local de desarrollo, sigue los siguientes pasos:

### Prerrequisitos
* Tener instalado **Node.js** (versión v18 o superior recomendada).
* Configurar la herramienta de comandos de Expo (o usar `npx`).
* (Opcional) Un simulador Android/iOS configurado o la app **Expo Go** instalada en tu teléfono físico.

### Pasos de ejecución
1. **Clona o ubícate en la carpeta del repositorio:**
   ```bash
   cd AppFinanzas
   ```

2. **Instala las dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo de Expo:**
   ```bash
   npm run start
   # o bien: npx expo start
   ```

4. **Ejecuta en tu dispositivo o emulador:**
   * Presiona **`a`** para abrir en un emulador o dispositivo Android conectado.
   * Presiona **`i`** para abrir en un simulador de iOS.
   * Escanea el código QR en la terminal utilizando la cámara de tu teléfono móvil (iOS) o la app Expo Go (Android) para probar directamente en el hardware físico con soporte biométrico funcional.

---

## 📁 Seguridad y Respaldo de Datos
Toda la información financiera (cuentas, transacciones, presupuestos e historial) es almacenada localmente de manera encriptada/segura en el almacenamiento interno de la aplicación en el dispositivo del usuario. La aplicación no requiere conexión a internet para realizar sus funciones principales y no envía datos personales a servidores externos, garantizando una privacidad del 100%.
