# FinanzasApp 📱💼

**FinanzasApp** es una aplicación móvil premium de finanzas personales desarrollada en **React Native** utilizando **Expo**. Está diseñada para permitir a los usuarios gestionar sus ingresos, gastos, transferencias entre cuentas, presupuestos y metas de ahorro de forma local y segura, con una experiencia visual fluida, moderna y adaptada al mercado mexicano.

---

## ✨ Características Principales

### 1. Panel de Control (Dashboard)
* **Resumen de Saldos:** Visualización del saldo neto combinando efectivo y cuentas de débito, así como el saldo deudor total en tarjetas de crédito.
* **Privacidad (Modo Incógnito):** Permite ocultar los saldos en pantalla con un solo toque (`balanceHidden` toggles `••••••••`).
* **Accesos Rápidos:** Botones interactivos para registrar movimientos rápidamente y navegar a los módulos de Metas, Suscripciones, Calendario, Presupuestos y Ajustes.
* **Tendencia de Gastos:** Minigráfico de barras que ilustra el gasto acumulado en los últimos 7 días.
* **Tarjetero Deslizable:** Carrusel de tarjetas bancarias configuradas, con estilos visuales que se adaptan a su marca.

### 2. Gestión de Cuentas y Tarjetas 💳
* Soporte para múltiples tipos de cuentas: *Efectivo, Banco, Tarjeta de Débito, Tarjeta de Crédito, Ahorro, Inversión y Monedero Digital*.
* **Branding Mexicano e Internacional:** Personalización automática de colores y logotipos según el proveedor (BBVA, Nu, Banamex, Santander, HSBC, Banorte, American Express, Mercado Pago, RappiCard, Klar, etc.).
* Detalle de cuentas con historial de transacciones específico y cálculo de saldo en tiempo real.

### 3. Registro de Transacciones con Teclado Numérico Personalizado 🔢
* Formulario interactivo para registrar **Ingresos**, **Gastos** y **Transferencias entre cuentas**.
* **Teclado Virtual Pinned (Numpad):** Diseñado a medida dentro de la aplicación para una entrada de montos ágil y precisa.
* Asignación de categorías (con iconos personalizados), notas y cuentas de origen/destino.

### 4. Presupuestos Mensuales 📊
* Permite fijar límites de gasto mensuales por categoría.
* Monitoreo dinámico con barras de progreso de color adaptativo:
  * 🟢 **Verde:** Gasto bajo control.
  * 🟡 **Naranja:** Umbral de advertencia alcanzado (≥ 80%).
  * 🔴 **Rosa/Rojo:** Presupuesto excedido (≥ 100%).
* Cálculo automático del saldo disponible o sobregirado.

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

---

## 🛠️ Tecnologías y Librerías Utilizadas

* **Framework:** React Native + Expo (SDK ~54.0.33)
* **Lenguaje:** TypeScript
* **Estilos y Diseño:** CSS Vanilla con componentes estructurados mediante Flexbox. Paleta de colores armoniosa con soporte nativo de **Tema Claro y Tema Oscuro** (`ThemeContext`).
* **Gestión del Estado:** Context API (`AppStateContext`) y Reductor nativo de React (`useReducer`) para control síncrono del estado global.
* **Persistencia:** `@react-native-async-storage/async-storage` para almacenamiento local persistente de movimientos, configuraciones y estado de seguridad.
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
