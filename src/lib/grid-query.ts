// Verified against the GRID Open Access schema and a completed LoL series.
// Deprecated headshots/teamHeadshots fail on current snapshots. Internal link
// metadata and recursive linked entities are not match statistics.
export const fullSnapshotQuery = `query WorldsFinal($id: ID!) {
  seriesState(id: $id) {
    id
    title {
      nameShortened
    }
    format
    started
    finished
    forfeited
    valid
    teams {
      id
      name
      score
      won
      kills
      killAssistsReceived
      killAssistsGiven
      killAssistsReceivedFromPlayer {
        id
        playerId
        killAssistsReceived
      }
      weaponKills {
        id
        weaponName
        count
      }
      teamkills
      teamkillAssistsReceived
      teamkillAssistsGiven
      teamkillAssistsReceivedFromPlayer {
        id
        playerId
        teamkillAssistsReceived
      }
      weaponTeamkills {
        id
        weaponName
        count
      }
      selfkills
      deaths
      firstKill
      structuresDestroyed
      structuresCaptured
      objectives {
        id
        type
        completedFirst
        completionCount
      }
      players {
        id
        name
        participationStatus
        kills
        killAssistsReceived
        killAssistsGiven
        killAssistsReceivedFromPlayer {
          id
          playerId
          killAssistsReceived
        }
        weaponKills {
          id
          weaponName
          count
        }
        teamkills
        teamkillAssistsReceived
        teamkillAssistsGiven
        teamkillAssistsReceivedFromPlayer {
          id
          playerId
          teamkillAssistsReceived
        }
        weaponTeamkills {
          id
          weaponName
          count
        }
        selfkills
        deaths
        firstKill
        structuresDestroyed
        structuresCaptured
        objectives {
          id
          type
          completedFirst
          completionCount
        }
        multikills {
          id
          numberOfKills
          count
        }
      }
      multikills {
        id
        numberOfKills
        count
      }
    }
    games {
      id
      sequenceNumber
      map {
        id
        name
        bounds {
          min {
            x
            y
          }
          max {
            x
            y
          }
        }
      }
      titleVersion {
        name
      }
      type
      started
      finished
      forfeited
      valid
      paused
      startedAt
      clock {
        id
        type
        ticking
        ticksBackwards
        currentSeconds
      }
      structures {
        id
        type
        side
        teamId
        respawnClock {
          id
          type
          ticking
          ticksBackwards
          currentSeconds
        }
        currentHealth
        maxHealth
        destroyed
        position {
          x
          y
        }
      }
      nonPlayerCharacters {
        id
        type
        side
        respawnClock {
          id
          type
          ticking
          ticksBackwards
          currentSeconds
        }
        position {
          x
          y
        }
        alive
      }
      teams {
        id
        name
        side
        won
        score
        money
        loadoutValue
        netWorth
        kills
        killAssistsReceived
        killAssistsGiven
        killAssistsReceivedFromPlayer {
          id
          playerId
          killAssistsReceived
        }
        weaponKills {
          id
          weaponName
          count
        }
        teamkills
        teamkillAssistsReceived
        teamkillAssistsGiven
        teamkillAssistsReceivedFromPlayer {
          id
          playerId
          teamkillAssistsReceived
        }
        weaponTeamkills {
          id
          weaponName
          count
        }
        selfkills
        deaths
        firstKill
        structuresDestroyed
        structuresCaptured
        objectives {
          id
          type
          completedFirst
          completionCount
        }
        unitKills {
          id
          unitName
          count
        }
        players {
          id
          name
          character {
            id
            name
          }
          roles {
            id
          }
          participationStatus
          money
          loadoutValue
          netWorth
          kills
          killAssistsReceived
          killAssistsGiven
          killAssistsReceivedFromPlayer {
            id
            playerId
            killAssistsReceived
          }
          weaponKills {
            id
            weaponName
            count
          }
          teamkills
          teamkillAssistsReceived
          teamkillAssistsGiven
          teamkillAssistsReceivedFromPlayer {
            id
            playerId
            teamkillAssistsReceived
          }
          weaponTeamkills {
            id
            weaponName
            count
          }
          selfkills
          deaths
          firstKill
          structuresDestroyed
          structuresCaptured
          inventory {
            items {
              id
              name
              quantity
              equipped
              stashed
            }
          }
          objectives {
            id
            type
            completedFirst
            completionCount
          }
          position {
            x
            y
          }
          multikills {
            id
            numberOfKills
            count
          }
          unitKills {
            id
            unitName
            count
          }
          abilities {
            id
            name
            ready
          }
          statusEffects {
            id
            name
            quantity
            clock {
              id
              type
              ticking
              ticksBackwards
              currentSeconds
            }
          }
          ... on GamePlayerStateLol {
            alive
            currentArmor
            currentHealth
            damageDealt
            damagePercentage
            damagePerMinute
            damagePerMoney
            damageTaken
            experiencePoints
            forwardPercentage
            kdaRatio
            killParticipation
            killsAndAssists
            maxHealth
            moneyPercentage
            moneyPerMinute
            respawnClock {
              id
              type
              ticking
              ticksBackwards
              currentSeconds
            }
            totalMoneyEarned
            visionScore
            visionScorePerMinute
          }
        }
        multikills {
          id
          numberOfKills
          count
        }
        ... on GameTeamStateLol {
          baronPowerPlays {
            id
            value
          }
          damageDealt
          damagePerMinute
          damagePerMoney
          damageTaken
          experiencePoints
          forwardPercentage
          kdaRatio
          killsAndAssists
          majorMoneyDeficit
          majorMoneyLead
          moneyDifference
          moneyPerMinute
          totalMoneyEarned
          visionScore
          visionScorePerMinute
        }
      }
      draftActions {
        id
        type
        sequenceNumber
        drafter {
          id
          type
        }
        draftable {
          id
          type
          name
        }
      }
      segments {
        id
        type
        sequenceNumber
        started
        draftActions {
          id
          type
          sequenceNumber
          drafter {
            id
            type
          }
          draftable {
            id
            type
            name
          }
        }
        finished
        startedAt
        teams {
          id
          name
          side
          won
          kills
          killAssistsReceived
          killAssistsGiven
          killAssistsReceivedFromPlayer {
            id
            playerId
            killAssistsReceived
          }
          weaponKills {
            id
            weaponName
            count
          }
          teamkills
          teamkillAssistsReceived
          teamkillAssistsGiven
          teamkillAssistsReceivedFromPlayer {
            id
            playerId
            teamkillAssistsReceived
          }
          weaponTeamkills {
            id
            weaponName
            count
          }
          selfkills
          deaths
          firstKill
          objectives {
            id
            type
            completedFirst
            completionCount
          }
          players {
            id
            name
            participationStatus
            kills
            killAssistsReceived
            killAssistsGiven
            killAssistsReceivedFromPlayer {
              id
              playerId
              killAssistsReceived
            }
            weaponKills {
              id
              weaponName
              count
            }
            teamkills
            teamkillAssistsReceived
            teamkillAssistsGiven
            teamkillAssistsReceivedFromPlayer {
              id
              playerId
              teamkillAssistsReceived
            }
            weaponTeamkills {
              id
              weaponName
              count
            }
            selfkills
            deaths
            firstKill
            objectives {
              id
              type
              completedFirst
              completionCount
            }
          }
        }
        duration
      }
      duration
    }
    draftActions {
      id
      type
      sequenceNumber
      drafter {
        id
        type
      }
      draftable {
        id
        type
        name
      }
    }
    updatedAt
    startedAt
    duration
  }
}`;
