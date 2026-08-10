import type { ReactNode } from "react";
import { IonContent, IonPage } from "@ionic/react";
import { Header } from "./Header";

export function Page({ children }: { children?: ReactNode }) {
  return (
    <IonPage>
      <Header />
      <IonContent>{children}</IonContent>
    </IonPage>
  );
}
