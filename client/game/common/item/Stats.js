class Stats { //Data structure which stores all stats in the game
	constructor() {
		this.health = 0;
		this.shield = 0;
		
		this.physicalDmg = 0;
		this.critChance = 0;
		this.attackSpeed = 0;

		this.stamina = 0;
		this.movementSpeed = 0;

		this.physicalDef = 0;
		this.techDef = 0;
	}
	addStats(stat) {
		this.health += stat.health;
		this.shield += stat.shield;

		this.physicalDmg += stat.physicalDmg;
		this.critChance += stat.criticalChance;
		this.attackSpeed += stat.attackSpeed;

		this.stamina += stat.stamina;
		this.movementSpeed += stat.movementSpeed;

		this.physicalDef += stat.physicalDef;
		this.techDef += stat.techDef;
	}
}
