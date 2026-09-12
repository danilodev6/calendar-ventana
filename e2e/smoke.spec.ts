import { expect, test, type Page } from "@playwright/test";

// Critical-flow smoke tests. Every flow uses its own data, selects elements
// by Spanish roles and labels (never CSS classes), and runs against an
// isolated database, so runs are repeatable and order-independent.

// Local civil date shifted by whole days, without UTC conversions.
function civilDatePlusDays(days: number): string {
  const now = new Date();
  const shifted = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
  );
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${shifted.getFullYear()}-${month}-${day}`;
}

async function fillNewReservation(
  page: Page,
  values: {
    guestName: string;
    phone?: string;
    checkIn: string;
    checkOut: string;
    statusLabel?: string;
    total?: string;
    deposit?: string;
    paymentLabel?: string;
  },
): Promise<void> {
  await page.goto("/reservations/new");
  await page.getByLabel("Nombre del huésped").fill(values.guestName);
  await page.getByLabel("Teléfono").fill(values.phone ?? "3410000000");
  await page.getByLabel("Entrada").fill(values.checkIn);
  await page.getByLabel("Salida").fill(values.checkOut);
  if (values.statusLabel !== undefined) {
    await page.getByLabel("Estado", { exact: true }).selectOption({ label: values.statusLabel });
  }
  if (values.total !== undefined) {
    await page.getByLabel("Total en pesos").fill(values.total);
  }
  if (values.deposit !== undefined) {
    await page.getByLabel("Seña en pesos").fill(values.deposit);
  }
  if (values.paymentLabel !== undefined) {
    await page.getByLabel("Estado del pago").selectOption({ label: values.paymentLabel });
  }
  await page.getByRole("button", { name: "Guardar reserva" }).click();
}

test("creates an inquiry and finds it in the calendar, history and detail", async ({
  page,
}) => {
  const checkIn = civilDatePlusDays(5);
  const checkOut = civilDatePlusDays(9);

  await fillNewReservation(page, {
    guestName: "Huésped E2E Uno",
    checkIn,
    checkOut,
  });
  await expect(page).toHaveURL(/\/reservations\/(?!new)[^/]+$/);

  await page.goto("/");
  await expect(
    page.locator(".fc-event-title", { hasText: "Huésped E2E Uno · Consulta" }),
  ).not.toHaveCount(0);

  await page.goto("/reservations");
  await page.getByLabel("Buscar por huésped").fill("Huésped E2E Uno");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: "Ver" }).click();
  await expect(
    page.getByRole("heading", { name: "Huésped E2E Uno" }),
  ).toBeVisible();
});

test("confirms a stay, blocks overlaps and allows adjacent stays", async ({
  page,
}) => {
  const firstIn = civilDatePlusDays(20);
  const firstOut = civilDatePlusDays(24);

  await fillNewReservation(page, {
    guestName: "Huésped E2E Dos",
    checkIn: firstIn,
    checkOut: firstOut,
    statusLabel: "Reservada",
  });
  await expect(page).toHaveURL(/\/reservations\/(?!new)[^/]+$/);

  await fillNewReservation(page, {
    guestName: "Huésped E2E Tres",
    checkIn: civilDatePlusDays(22),
    checkOut: civilDatePlusDays(26),
    statusLabel: "Reservada",
  });
  await expect(page.getByText(/ya están ocupadas/)).toBeVisible();
  await expect(page).toHaveURL(/\/reservations\/new/);

  await fillNewReservation(page, {
    guestName: "Huésped E2E Tres",
    checkIn: firstOut,
    checkOut: civilDatePlusDays(28),
    statusLabel: "Reservada",
  });
  await expect(page).toHaveURL(/\/reservations\/(?!new)[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Huésped E2E Tres" }),
  ).toBeVisible();
});

test("moves a stay from deposit to full payment and then cancels it", async ({
  page,
}) => {
  const checkIn = civilDatePlusDays(40);
  const month = checkIn.slice(0, 7);

  await fillNewReservation(page, {
    guestName: "Huésped E2E Cuatro",
    checkIn,
    checkOut: civilDatePlusDays(44),
    statusLabel: "Reservada",
    total: "500000",
    deposit: "100000",
    paymentLabel: "Seña pagada",
  });
  await expect(page).toHaveURL(/\/reservations\/(?!new)[^/]+$/);

  await page.goto(`/balance?month=${month}`);
  const main = page.locator("main");
  await expect(main).not.toContainText("500.000");

  // Reopen the detail from the history to edit the payment status.
  await page.goto("/reservations");
  await page.getByLabel("Buscar por huésped").fill("Huésped E2E Cuatro");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: "Ver" }).click();
  await page.getByRole("link", { name: "Editar reserva" }).click();
  await page.getByLabel("Estado del pago").selectOption({ label: "Pagado completo" });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/reservations\/(?!new)[^/]+$/);

  await page.goto(`/balance?month=${month}`);
  await expect(page.locator("main")).toContainText("500.000");

  await page.goto("/reservations");
  await page.getByLabel("Buscar por huésped").fill("Huésped E2E Cuatro");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: "Ver" }).click();
  await page.getByRole("button", { name: "Cancelar reserva" }).click();
  await page.getByRole("button", { name: "Sí, cancelar reserva" }).click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();

  await page.goto(`/balance?month=${month}`);
  await expect(page.locator("main")).not.toContainText("500.000");
  await page.goto("/reservations?filter=cancelled");
  await expect(page.getByText("Huésped E2E Cuatro")).toBeVisible();
});

test("adds an expense and sees it reflected in the result", async ({
  page,
}) => {
  const date = civilDatePlusDays(70);
  const month = date.slice(0, 7);

  await page.goto("/balance");
  await page.getByRole("link", { name: "Agregar gasto" }).click();
  await page.getByLabel("Fecha").fill(date);
  await page.getByLabel("Descripción").fill("Gasto E2E");
  await page.getByLabel("Monto en pesos").fill("120000");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/balance/);

  await page.goto(`/balance?month=${month}`);
  await expect(page.getByText("Gasto E2E")).toBeVisible();
  await expect(page.locator("main")).toContainText("120.000");
  await expect(page.locator("main")).toContainText(/-\s?\$?\s?120\.000/);
});
