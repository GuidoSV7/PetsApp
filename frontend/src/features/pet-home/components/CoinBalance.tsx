import { GoldCoinIcon } from "@/features/pet-home/components/GoldCoinIcon";
import { coinsLabel } from "@/features/pet-home/pet-coins";
import styles from "./pet-home.module.css";

type Props = {
  balance: number;
  showAdd?: boolean;
};

/** Gold coin badge showing the balance from the pet API.
 * `showAdd` stays off until a real top-up flow exists (no decorative +).
 */
export function CoinBalance({ balance, showAdd = false }: Props) {
  return (
    <div className={styles.coinBalance} aria-label={coinsLabel(balance)}>
      <GoldCoinIcon className={styles.coinIcon} />
      <span className={styles.coinAmount} aria-hidden="true">
        {balance}
      </span>
      {showAdd ? (
        <span className={styles.coinAdd} aria-hidden="true">
          +
        </span>
      ) : null}
    </div>
  );
}
